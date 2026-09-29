"""Run only against an explicitly configured disposable database ending in _test."""
import asyncio
import os
from datetime import datetime, timedelta, timezone

import pytest
from alembic import command
from alembic.config import Config
from fastapi import Response
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import Settings
from app.api.auth import delete_session_cookie, session_cookie_samesite, set_session_cookie
from app.main import create_app
from app.models import Session, User
from app.services.auth import hash_token
from tests.auth_helpers import TEST_TOKEN, signed_data as make_signed_data
from uuid import uuid4
from tests.locality_helpers import ensure_localities, locality_patch


def test_session_cookie_policy_supports_max_web_iframe():
    assert session_cookie_samesite(secure=True) == "none"
    assert session_cookie_samesite(secure=False) == "lax"

    secure = Response()
    set_session_cookie(secure, "test-token", 60, True)
    header = secure.headers["set-cookie"]
    assert "HttpOnly" in header
    assert "Path=/api" in header
    assert "SameSite=none" in header
    assert "Secure" in header
    assert "Partitioned" in header

    local = Response()
    set_session_cookie(local, "test-token", 60, False)
    assert "SameSite=lax" in local.headers["set-cookie"]
    assert "Partitioned" not in local.headers["set-cookie"]

    deleted = Response()
    delete_session_cookie(deleted, True)
    assert "Partitioned" in deleted.headers["set-cookie"]
    assert "Max-Age=0" in deleted.headers["set-cookie"]


@pytest.fixture
def database(monkeypatch):
    url = os.getenv('TEST_DATABASE_URL')
    if not url:
        pytest.skip('Set TEST_DATABASE_URL for disposable PostgreSQL integration test')
    if not make_url(url).database.endswith('_test'):
        pytest.fail('Integration database name must end in _test')
    monkeypatch.setenv('DATABASE_URL', url)
    config = Config('alembic.ini')
    command.upgrade(config, 'head')
    ensure_localities(url, 'Казань', 'Москва', 'Тула')
    yield url
    # This fixture never drops data. The caller removes the disposable container.


def test_login_profile_isolation_logout_and_expiration(database):
    first_max_id = uuid4().int % (2**60)

    def signed_data(user_id=first_max_id):
        return make_signed_data(user_id=user_id)

    settings = Settings(database_url=database, max_bot_token=TEST_TOKEN, cookie_secure=False,
                        allowed_origins=['http://localhost:5173'], _env_file=None)
    origin = {'Origin': 'http://localhost:5173'}
    application = create_app(settings)
    with TestClient(application) as client:
        assert client.get('/api/me').status_code == 401
        denied = client.post('/api/auth/max', json={'initData': signed_data()})
        assert denied.status_code == 403
        invalid = client.post('/api/auth/max', headers=origin, json={'initData': 'secret-invalid'})
        assert invalid.status_code == 401
        assert 'secret-invalid' not in invalid.text
        malformed = client.post('/api/auth/max', headers=origin, json={'initData': {'secret': 1}})
        assert malformed.status_code == 422
        assert 'secret' not in malformed.text
        response = client.post('/api/auth/max', headers=origin, json={'initData': signed_data()})
        assert response.status_code == 200, response.text
        first_id = response.json()['id']
        assert not response.json()['profileCompleted']
        assert 'HttpOnly' in response.headers['set-cookie']
        assert 'SameSite=lax' in response.headers['set-cookie']
        assert response.headers['cache-control'] == 'no-store'
        assert 'maxUserId' not in response.json() and 'verified' not in response.json()
        first_cookie = client.cookies.get('priut_session')
        patch = locality_patch('Казань', name='Гость', interests=['Музыка'], avatarColor='violet')
        assert client.patch('/api/me', headers={'Origin': 'https://evil.example'}, json=patch).status_code == 403
        response = client.patch('/api/me', headers=origin, json=patch)
        assert response.status_code == 200, response.text
        assert response.json()['profileCompleted']
        assert client.patch('/api/me', headers=origin, json={'verified': True}).status_code == 422
        response = client.post('/api/auth/max', headers=origin, json={'initData': signed_data()})
        assert response.json()['id'] == first_id
        assert response.json()['name'] == 'Гость'
        rotated_cookie = client.cookies.get('priut_session')
        assert first_cookie != rotated_cookie
        assert client.get('/api/me', headers={'Cookie': f'priut_session={first_cookie}'}).status_code == 401

        response = client.post('/api/auth/max', headers=origin, json={'initData': signed_data(user_id=first_max_id + 1)})
        assert response.json()['id'] != first_id
        assert response.json()['city'] == ''
        second_cookie = client.cookies.get('priut_session')
        assert client.post('/api/auth/logout', headers=origin).status_code == 204
        assert client.get('/api/me', headers={'Cookie': f'priut_session={second_cookie}'}).status_code == 401
        assert client.post('/api/auth/logout', headers=origin).status_code == 204
        client.post('/api/auth/max', headers=origin, json={'initData': signed_data()})
        cookie = client.cookies.get('priut_session')

        async def expire():
            engine = create_async_engine(database)
            async with engine.begin() as connection:
                stored = (await connection.execute(select(Session.token_hash).where(Session.token_hash == hash_token(cookie)))).scalar_one()
                assert stored != cookie
                count = (await connection.execute(select(User.id).where(User.max_user_id == first_max_id))).all()
                assert len(count) == 1
                await connection.execute(update(Session).where(Session.token_hash == stored).values(expires_at=datetime.now(timezone.utc)-timedelta(seconds=1)))
            await engine.dispose()
        asyncio.run(expire())
        assert client.get('/api/me').status_code == 401

    # New application instance uses the same DB; profiles survive app restart.
    with TestClient(create_app(settings)) as restarted:
        response = restarted.post('/api/auth/max', headers=origin, json={'initData': signed_data()})
        assert response.json()['id'] == first_id
        assert response.json()['city'] == 'Казань'


def test_bearer_session_works_when_embedded_browser_blocks_cookies(database):
    settings = Settings(database_url=database, max_bot_token=TEST_TOKEN, cookie_secure=True,
                        allowed_origins=['https://mini.example'], _env_file=None)
    origin = {'Origin': 'https://mini.example'}
    identity = uuid4().int % (2**60)
    with TestClient(create_app(settings)) as client:
        login = client.post('/api/auth/max', headers=origin,
                            json={'initData': make_signed_data(user_id=identity)})
        assert login.status_code == 200
        token = login.json()['sessionToken']
        assert token and f'priut_session={token}' in login.headers['set-cookie']
        client.cookies.clear()
        bearer = {**origin, 'Authorization': f'Bearer {token}'}
        assert client.get('/api/me', headers=bearer).status_code == 200
        saved = client.patch('/api/me', headers=bearer,
                             json=locality_patch('Казань', name='Новый гость', interests=['Музыка']))
        assert saved.status_code == 200
        assert saved.json()['profileCompleted'] is True
        assert client.post('/api/auth/logout', headers=bearer).status_code == 204
        assert client.get('/api/me', headers=bearer).status_code == 401


def test_database_connection_failure_is_safe(database):
    # Port 1 is not the test DB. No database mutation is performed here.
    settings = Settings(database_url='postgresql+asyncpg://unused:private-value@127.0.0.1:1/unused',
                        max_bot_token=TEST_TOKEN, cookie_secure=False, database_timeout_seconds=1, _env_file=None)
    with TestClient(create_app(settings)) as client:
        response = client.get('/api/me', headers={'Cookie': 'priut_session=synthetic'})
        assert response.status_code == 503
        assert response.json()['error']['code'] == 'database_unavailable'
        assert 'private-value' not in response.text
