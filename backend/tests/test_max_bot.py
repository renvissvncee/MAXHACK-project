import asyncio
import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.max_bot.client import MaxAPIError, MaxClient
from app.max_bot.config import BotSettings
from app.max_bot.handlers import handle_update, welcome_body
from app.max_bot.polling import load_marker, poll_once, save_marker


def test_client_contract_and_sanitized_error():
    async def scenario():
        def transport(request):
            assert request.headers['Authorization'] == 'test-secret'
            assert 'test-secret' not in str(request.url)
            if request.url.path == '/updates':
                assert request.url.params['marker'] == '0'
                return httpx.Response(200, json={'updates': [], 'marker': 42})
            if request.url.path == '/messages':
                assert request.url.params['chat_id'] == '10'
                assert json.loads(request.content) == {'text': 'hello'}
                return httpx.Response(200, json={'message': {}})
            return httpx.Response(401, json={'error': 'test-secret'})
        async with MaxClient('test-secret', httpx.MockTransport(transport)) as client:
            assert (await client.get_updates(0))['marker'] == 42
            await client.send_message(10, {'text': 'hello'})
            with pytest.raises(MaxAPIError) as exc:
                await client.get_me()
            assert exc.value.status == 401
            assert 'test-secret' not in str(exc.value)
    asyncio.run(scenario())


def test_handlers_ignore_groups_bots_and_unrelated_text():
    async def scenario():
        client = AsyncMock()
        assert await handle_update(client, {'update_type': 'bot_started', 'chat_id': 12}, '', False)
        event = {'update_type': 'message_created', 'message': {
            'sender': {'is_bot': False}, 'recipient': {'chat_type': 'dialog', 'chat_id': 12},
            'body': {'text': '/start'}}}
        assert await handle_update(client, event, '', False)
        event['message']['sender']['is_bot'] = True
        assert not await handle_update(client, event, '', False)
        event['message']['sender']['is_bot'] = False
        event['message']['recipient']['chat_type'] = 'chat'
        assert not await handle_update(client, event, '', False)
        event['message']['recipient']['chat_type'] = 'dialog'
        event['message']['body']['text'] = 'hello'
        assert not await handle_update(client, event, '', False)
        assert client.send_message.await_count == 2
    asyncio.run(scenario())


def test_mini_app_button_is_explicitly_enabled():
    assert 'attachments' not in welcome_body('test_bot', False)
    button = welcome_body('test_bot', True)['attachments'][0]['payload']['buttons'][0][0]
    assert button['url'] == 'https://max.ru/test_bot?startapp=home'


def test_failed_send_does_not_advance_cursor(tmp_path):
    async def scenario():
        settings = BotSettings(max_bot_token='test', max_polling_cursor_file=tmp_path/'marker.json', _env_file=None)
        save_marker(settings.max_polling_cursor_file, 5)
        client = AsyncMock()
        client.get_updates.return_value = {'updates': [{'update_type': 'bot_started', 'chat_id': 1}], 'marker': 6}
        client.send_message.side_effect = MaxAPIError(503)
        with pytest.raises(MaxAPIError):
            await poll_once(client, settings, 5)
        assert load_marker(settings.max_polling_cursor_file) == 5
        client.get_updates.return_value = {'updates': [], 'marker': 6}
        assert await poll_once(client, settings, 5) == 6
        assert load_marker(settings.max_polling_cursor_file) == 6
    asyncio.run(scenario())


def test_existing_webhook_blocks_polling_without_reading_updates(tmp_path):
    from unittest.mock import patch
    from app.max_bot.polling import run

    async def scenario():
        settings = BotSettings(max_bot_token='test', _env_file=None)
        client = AsyncMock()
        client.get_subscriptions.return_value = [{'url': 'https://example.org/webhook'}]
        context = AsyncMock()
        context.__aenter__.return_value = client
        with patch('app.max_bot.polling.BotSettings', return_value=settings), patch('app.max_bot.polling.MaxClient', return_value=context):
            with pytest.raises(ValueError, match='Active webhook'):
                await run()
        client.get_updates.assert_not_called()
        client.send_message.assert_not_called()
    asyncio.run(scenario())


def test_transport_errors_have_safe_reasons():
    async def scenario():
        for exception, reason in [
            (httpx.ConnectError('CERTIFICATE_VERIFY_FAILED secret'), 'tls_certificate_untrusted'),
            (httpx.ReadTimeout('secret'), 'timeout'),
            (httpx.ConnectError('secret'), 'connection_failed'),
        ]:
            def fail(request):
                raise exception
            async with MaxClient('secret', httpx.MockTransport(fail)) as client:
                with pytest.raises(MaxAPIError) as result:
                    await client.get_me()
                assert result.value.reason == reason
                assert 'secret' not in str(result.value)
    asyncio.run(scenario())
