from app.max_bot.client import MaxClient


def welcome_body(bot_username: str, mini_app_enabled: bool) -> dict:
    body = {"text": "Добро пожаловать в Приют! Здесь путешественники находят хозяев и знакомятся перед поездкой."}
    if mini_app_enabled and bot_username:
        body["attachments"] = [{
            "type": "inline_keyboard",
            "payload": {"buttons": [[{
                "type": "link", "text": "Открыть Приют",
                "url": f"https://max.ru/{bot_username}?startapp=home",
            }]]},
        }]
    else:
        body["text"] += " Мини-приложение пока подключается."
    return body


async def handle_update(client: MaxClient, update: dict, username: str, enabled: bool) -> bool:
    kind = update.get("update_type")
    chat_id = None
    if kind == "bot_started":
        chat_id = update.get("chat_id")
    elif kind == "message_created":
        message = update.get("message") or {}
        sender = message.get("sender") or {}
        recipient = message.get("recipient") or {}
        text = (message.get("body") or {}).get("text") or ""
        if sender.get("is_bot") or recipient.get("chat_type") != "dialog":
            return False
        if text.strip() not in {"/start", "/help"}:
            return False
        chat_id = recipient.get("chat_id")
    if type(chat_id) is not int:
        return False
    await client.send_message(chat_id, welcome_body(username, enabled))
    return True
