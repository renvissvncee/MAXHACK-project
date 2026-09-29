from typing import Annotated

from fastapi import Depends, Request

from app.db import DbSession
from app.errors import AppError
from app.models import User
from app.services.auth import COOKIE_NAME, authenticate


async def check_origin(request: Request):
    if request.headers.get("origin") not in request.app.state.settings.allowed_origins:
        raise AppError("origin_not_allowed", "Недопустимый источник запроса.", 403)


def request_session_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if authorization:
        scheme, separator, token = authorization.partition(" ")
        if separator and scheme.casefold() == "bearer" and token and " " not in token:
            return token
        raise AppError("unauthorized", "Войдите через MAX.", 401)
    return request.cookies.get(COOKIE_NAME)


async def current_user(request: Request, db: DbSession) -> User:
    return await authenticate(db, request_session_token(request))


CurrentUser = Annotated[User, Depends(current_user)]
