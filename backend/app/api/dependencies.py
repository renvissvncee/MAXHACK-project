from typing import Annotated

from fastapi import Depends, Request

from app.db import DbSession
from app.errors import AppError
from app.models import User
from app.services.auth import COOKIE_NAME, authenticate


async def check_origin(request: Request):
    if request.headers.get("origin") not in request.app.state.settings.allowed_origins:
        raise AppError("origin_not_allowed", "Недопустимый источник запроса.", 403)


async def current_user(request: Request, db: DbSession) -> User:
    return await authenticate(db, request.cookies.get(COOKIE_NAME))


CurrentUser = Annotated[User, Depends(current_user)]
