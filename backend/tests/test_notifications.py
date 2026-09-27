import asyncio
from uuid import uuid4
import httpx
import pytest
from app.max_bot.client import MaxAPIError, MaxClient
from app.workers.notifications import WorkerSettings, Delivery, message_body, retryable


def test_message_body_no_contacts_and_valid_deeplink():
    settings = WorkerSettings(database_url="postgresql+asyncpg://unused/unused", max_bot_username="test_bot",
                              max_mini_app_enabled=True, _env_file=None)
    job = Delivery(uuid4(), uuid4(), 123, "request_accepted", 1)
    body = message_body(job, settings)
    assert str(job.recipient) not in body['text']
    assert body['attachments'][0]['payload']['buttons'][0][0]['url'] == f'https://max.ru/test_bot?startapp=notification_{job.id}'
    settings.max_mini_app_enabled = False
    assert 'attachments' not in message_body(job, settings)


@pytest.mark.parametrize('status,retry', [(None, True),(408,True),(429,True),(500,True),(503,True),(400,False),(401,False),(403,False),(404,False)])
def test_retry_policy(status, retry):
    assert retryable(MaxAPIError(status)) == retry


def test_send_to_user_contract_and_bad_response():
    async def scenario():
        def transport(request):
            assert request.url.params['user_id'] == '123'
            assert 'chat_id' not in request.url.params
            return httpx.Response(200, json={'message':{'body':{'mid':'mid-test'}}})
        async with MaxClient('synthetic', httpx.MockTransport(transport)) as client:
            assert await client.send_user_message(123, {'text':'Test'}) == 'mid-test'
        for body in ({}, {'message':'invalid'}, {'message':{'body':[]}}):
            async with MaxClient('synthetic', httpx.MockTransport(lambda _: httpx.Response(200,json=body))) as client:
                with pytest.raises(MaxAPIError):
                    await client.send_user_message(123, {'text':'Test'})
    asyncio.run(scenario())
