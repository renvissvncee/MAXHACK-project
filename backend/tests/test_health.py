from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_health_contract_and_recovery():
    settings = Settings(database_url="postgresql+asyncpg://test:test@localhost/test", _env_file=None)
    with patch("app.api.health.check_database", new_callable=AsyncMock) as check:
        with TestClient(create_app(settings)) as client:
            assert client.get("/api/health/live").json() == {"status": "ok"}
            assert client.get("/api/health/ready").json() == {"status": "ready"}
            check.side_effect = TimeoutError("secret must not leak")
            response = client.get("/api/health/ready")
            assert response.status_code == 503
            assert response.json() == {"status": "unavailable"}
            assert client.get("/api/health/live").status_code == 200
            check.side_effect = None
            assert client.get("/api/health/ready").status_code == 200
            assert client.get("/openapi.json").status_code == 200
