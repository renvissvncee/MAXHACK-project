import asyncio
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from app.errors import AppError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    # A session per request. Business operations explicitly own their transaction.
    try:
        async with request.app.state.session_factory() as session:
            yield session
    except (OSError, TimeoutError):
        raise AppError("database_unavailable", "База данных временно недоступна. Попробуйте позже.", 503) from None


DbSession = Annotated[AsyncSession, Depends(get_session)]


async def check_database(engine: AsyncEngine, timeout: float) -> None:
    async with asyncio.timeout(timeout):
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
