from fastapi import APIRouter, Query
from uuid import UUID

from app.api.dependencies import CurrentUser
from app.db import DbSession
from app.schemas.localities import LocalityResponse
from app.schemas.profile import ErrorResponse
from app.services.localities import suggest_localities
from app.services.localities import require_locality


router = APIRouter(
    prefix="/api/localities",
    tags=["localities"],
    responses={401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)


@router.get("/suggest", response_model=list[LocalityResponse])
async def suggest(
    user: CurrentUser,
    db: DbSession,
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=10, ge=1, le=20),
):
    del user
    return [LocalityResponse.from_locality(row) for row in await suggest_localities(db, q, limit)]


@router.get("/{locality_id}", response_model=LocalityResponse)
async def read_locality(locality_id: UUID, user: CurrentUser, db: DbSession):
    del user
    return LocalityResponse.from_locality(await require_locality(db, locality_id))
