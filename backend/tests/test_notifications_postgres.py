import asyncio
from datetime import timedelta
from unittest.mock import AsyncMock
from uuid import uuid4
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app
from app.models import Notification, User
from app.max_bot.client import MaxAPIError
from app.services.notifications import enqueue
from app.workers.notifications import WorkerSettings, claim, finish, deliver_one, requeue, now_utc
from tests.auth_helpers import TEST_TOKEN
from tests.test_auth_postgres import database
from tests.test_listings_postgres import OFFER, ORIGIN, login


def test_event_inbox_privacy_and_read_contract(database):
    settings = Settings(database_url=database, max_bot_token=TEST_TOKEN, cookie_secure=False,
                        allowed_origins=['http://localhost:5173'], _env_file=None)
    with TestClient(create_app(settings)) as c:
        host = login(c, uuid4().int % (2**60)); hc=dict(c.cookies)
        c.patch('/api/me',headers=ORIGIN,json={'city':'Тула','interests':['Кино']})
        offer=c.put('/api/me/listing',headers=ORIGIN,json=OFFER).json()
        c.cookies.clear(); login(c,uuid4().int % (2**60)); gc=dict(c.cookies)
        c.patch('/api/me',headers=ORIGIN,json={'city':'Тула','interests':['Кино']})
        data={'clientRequestId':str(uuid4()),'listingId':offer['id'],'dateFrom':'2030-08-01','dateTo':'2030-08-02','guests':1}
        request=c.post('/api/requests',headers=ORIGIN,json=data).json()
        c.post('/api/requests',headers=ORIGIN,json=data)
        assert c.get('/api/notifications').json()['items'] == []
        c.cookies.clear(); c.cookies.update(hc)
        inbox=c.get('/api/notifications').json()
        assert inbox['unreadCount']==1 and len(inbox['items'])==1
        notice=inbox['items'][0]; nid=notice['id']
        assert c.get(f'/api/notifications/{nid}').json()==notice
        assert notice['kind']=='request_created' and notice['targetId']==request['id']
        assert 'recipientId' not in notice and 'lastError' not in notice
        assert c.post(f'/api/notifications/{nid}/read').status_code==403
        read=c.post(f'/api/notifications/{nid}/read',headers=ORIGIN).json()
        assert read['readAt']
        assert c.post(f'/api/notifications/{nid}/read',headers=ORIGIN).json()==read
        assert c.get('/api/notifications?unread_only=true').json()=={'unreadCount':0,'items':[]}
        decision=f"/api/requests/{request['id']}"
        c.patch(decision,headers=ORIGIN,json={'status':'accepted'})
        c.patch(decision,headers=ORIGIN,json={'status':'accepted'})
        c.cookies.clear(); c.cookies.update(gc)
        assert c.get(f'/api/notifications/{nid}').status_code==404
        assert c.post(f'/api/notifications/{nid}/read',headers=ORIGIN).status_code==404
        assert c.get('/api/notifications').json()['items'][0]['kind']=='request_accepted'
        review=f"/api/users/{host['id']}/review"
        c.put(review,headers=ORIGIN,json={'rating':5})
        c.put(review,headers=ORIGIN,json={'rating':3})
        c.cookies.clear(); c.cookies.update(hc)
        inbox=c.get('/api/notifications').json()
        assert len(inbox['items'])==2 and inbox['unreadCount']==1
        assert inbox['items'][0]['kind']=='review_created'
        assert inbox['items'][0]['targetType']=='user_reviews'
        assert c.get('/api/notifications?offset=100').json()['unreadCount']==1
        assert c.get('/api/notifications?limit=101').status_code==422
        c.cookies.clear(); login(c,uuid4().int % (2**60))
        assert c.get('/api/notifications').json()['items']==[]
        c.cookies.clear()
        assert c.get('/api/notifications').status_code==401


def test_outbox_transactions_retries_crash_recovery_and_fencing(database):
    async def scenario():
        engine=create_async_engine(database)
        factory=async_sessionmaker(engine,expire_on_commit=False)
        settings=WorkerSettings(database_url=database,notification_max_attempts=3,_env_file=None)
        try:
            # Isolate the delivery tests from inbox events created by other tests.
            async with factory() as db:
                await db.execute(update(Notification).values(delivery_status='sent'))
                user=User(max_user_id=uuid4().int % (2**60),name='Synthetic')
                db.add(user); await db.commit(); uid=user.id
            rolled=f'test-rollback:{uuid4()}'
            async with factory() as db:
                await enqueue(db,uid,'request_created',rolled,uuid4())
                await db.rollback()
            async with factory() as db:
                assert await db.scalar(select(Notification.id).where(Notification.event_key==rolled)) is None
            event=f'test-delivery:{uuid4()}'
            async with factory() as db:
                await enqueue(db,uid,'request_created',event,uuid4())
                await enqueue(db,uid,'request_created',event,uuid4())
                await db.commit()
                assert await db.scalar(select(func.count()).select_from(Notification).where(Notification.event_key==event))==1
            now=now_utc()
            jobs=await asyncio.gather(claim(factory,settings,now),claim(factory,settings,now))
            job=next(j for j in jobs if j)
            assert sum(j is not None for j in jobs)==1
            assert await claim(factory,settings,now+timedelta(seconds=119)) is None
            recovered=await claim(factory,settings,now+timedelta(seconds=121))
            assert recovered.id==job.id and recovered.attempts==2 and recovered.lease_token!=job.lease_token
            assert not await finish(factory,job,settings,message_id='stale')
            assert await finish(factory,recovered,settings,error=MaxAPIError(429),now=now)
            assert await claim(factory,settings,now+timedelta(seconds=59)) is None
            final=await claim(factory,settings,now+timedelta(seconds=61))
            assert final.attempts==3
            # Crash on final attempt becomes terminal once the lease expires.
            assert await claim(factory,settings,now+timedelta(seconds=182)) is None
            async with factory() as db:
                assert (await db.get(Notification,job.id)).delivery_status=='failed'
            assert await requeue(factory,job.id)
            assert not await requeue(factory,job.id)
            client=AsyncMock(); client.send_user_message.return_value='mid-synthetic'
            assert await deliver_one(factory,client,settings)
            async with factory() as db:
                sent=await db.get(Notification,job.id)
                assert sent.delivery_status=='sent' and sent.max_message_id=='mid-synthetic' and sent.sent_at
                assert sent.read_at is None
            client.send_user_message.assert_awaited_once()
            assert not await deliver_one(factory,client,settings)
            # Permanent failure keeps the in-app item available; temporary failure is scheduled.
            for status,expected in [(403,'failed'),(500,'pending')]:
                async with factory() as db:
                    await enqueue(db,uid,'request_declined',f'test-error:{uuid4()}',uuid4()); await db.commit()
                failed=await claim(factory,settings)
                await finish(factory,failed,settings,error=MaxAPIError(status))
                async with factory() as db:
                    row=await db.get(Notification,failed.id)
                    assert row.delivery_status==expected and row.last_error==f'http_{status}'
        finally:
            await engine.dispose()
    asyncio.run(scenario())


def test_notification_failure_rolls_back_business_event(database, monkeypatch):
    from app.services import requests as service
    from app.errors import AppError
    settings=Settings(database_url=database,max_bot_token=TEST_TOKEN,cookie_secure=False,
                      allowed_origins=['http://localhost:5173'],_env_file=None)
    with TestClient(create_app(settings)) as c:
        login(c,uuid4().int % (2**60))
        c.patch('/api/me',headers=ORIGIN,json={'city':'Тула','interests':['Кино']})
        offer=c.put('/api/me/listing',headers=ORIGIN,json=OFFER).json()
        c.cookies.clear(); login(c,uuid4().int % (2**60))
        c.patch('/api/me',headers=ORIGIN,json={'city':'Тула','interests':['Кино']})
        payload={'clientRequestId':str(uuid4()),'listingId':offer['id'],'dateFrom':'2030-08-01','dateTo':'2030-08-02','guests':1}
        original=service.enqueue
        async def fail(*args):
            raise AppError('database_unavailable','Synthetic queue failure',503)
        monkeypatch.setattr(service,'enqueue',fail)
        assert c.post('/api/requests',headers=ORIGIN,json=payload).status_code==503
        assert c.get('/api/requests?direction=outgoing').json()==[]
        monkeypatch.setattr(service,'enqueue',original)
        assert c.post('/api/requests',headers=ORIGIN,json=payload).status_code==200
        assert len(c.get('/api/requests?direction=outgoing').json())==1
