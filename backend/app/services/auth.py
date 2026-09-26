import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from app.errors import AppError
from app.models import Session, User

COOKIE_NAME = "priut_session"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def login(db, identity, lifetime: int, previous_token: str | None):
    values = dict(id=uuid4(), max_user_id=identity.id, max_username=identity.username,
                  photo_url=identity.photo_url,
                  name=" ".join(filter(None, [identity.first_name, identity.last_name]))[:120],
                  city="", bio="", interests=[], avatar_emoji="👤", avatar_color="violet")
    query = insert(User).values(**values).on_conflict_do_update(
        index_elements=[User.max_user_id],
        set_={"max_username": identity.username, "photo_url": identity.photo_url},
    ).returning(User)
    user = (await db.execute(query)).scalar_one()
    # Delete only expired sessions; keep other devices logged in.
    await db.execute(delete(Session).where(Session.expires_at <= datetime.now(timezone.utc)))
    if previous_token:
        await db.execute(delete(Session).where(Session.token_hash == hash_token(previous_token)))
    token = secrets.token_urlsafe(32)
    db.add(Session(token_hash=hash_token(token), user_id=user.id,
                   expires_at=datetime.now(timezone.utc) + timedelta(seconds=lifetime)))
    await db.commit()
    return user, token


async def authenticate(db, token: str | None):
    if not token or len(token) > 128:
        raise AppError("unauthorized", "Войдите через MAX.", 401)
    user = (await db.execute(select(User).join(Session, Session.user_id == User.id).where(
        Session.token_hash == hash_token(token), Session.expires_at > datetime.now(timezone.utc),
    ))).scalar_one_or_none()
    if user is None:
        raise AppError("unauthorized", "Сессия истекла. Войдите через MAX.", 401)
    return user


async def logout(db, token: str | None):
    if token:
        await db.execute(delete(Session).where(Session.token_hash == hash_token(token)))
        await db.commit()
