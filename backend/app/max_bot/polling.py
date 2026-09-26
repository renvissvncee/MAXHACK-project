import argparse
import asyncio
import json
import logging
from pathlib import Path

from pydantic import ValidationError

from app.max_bot.client import MaxAPIError, MaxClient
from app.max_bot.config import BotSettings
from app.max_bot.handlers import handle_update

logger = logging.getLogger(__name__)


def load_marker(path: Path) -> int | None:
    if not path.exists():
        return None
    value = json.loads(path.read_text())["marker"]
    if value is not None and type(value) is not int:
        raise ValueError("Invalid cursor")
    return value


def save_marker(path: Path, marker: int | None):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps({"marker": marker}))
    temporary.replace(path)


async def poll_once(client, settings, marker):
    page = await client.get_updates(marker)
    updates, next_marker = page.get("updates"), page.get("marker")
    if not isinstance(updates, list) or any(not isinstance(u, dict) for u in updates):
        raise MaxAPIError()
    if "marker" not in page or (next_marker is not None and type(next_marker) is not int):
        raise MaxAPIError()
    for update in updates:
        sent = await handle_update(client, update, settings.max_bot_username, settings.max_mini_app_enabled)
        if sent:
            await asyncio.sleep(0.55)  # Below the per-chat limit of 2 messages/sec.
    save_marker(settings.max_polling_cursor_file, next_marker)
    return next_marker


async def run(check_only=False):
    settings = BotSettings()
    if settings.max_mini_app_enabled and not settings.max_bot_username:
        raise ValueError("MAX_BOT_USERNAME required for mini-app")
    async with MaxClient(settings.max_bot_token.get_secret_value()) as client:
        await client.get_me()
        if await client.get_subscriptions():
            raise ValueError("Active webhook: polling cannot run; subscription left unchanged")
        logger.info("max_connection_ok")
        if check_only:
            return
        marker = load_marker(settings.max_polling_cursor_file)
        while True:
            # Fail visibly rather than silently dropping a failed delivery.
            marker = await poll_once(client, settings, marker)
            await asyncio.sleep(0.1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Check token and webhook state without reading events")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    try:
        asyncio.run(run(args.check))
    except KeyboardInterrupt:
        pass
    except (ValidationError, ValueError, OSError, MaxAPIError) as error:
        # Never print API response bodies, settings inputs or exception tracebacks.
        logger.error("bot_stopped error_type=%s status=%s reason=%s; check configuration and connectivity", type(error).__name__, getattr(error, "status", None), getattr(error, "reason", "configuration_or_cursor"))
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
