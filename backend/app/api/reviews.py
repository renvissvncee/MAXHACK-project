from uuid import UUID
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import CurrentUser, check_origin
from app.db import DbSession
from app.schemas.profile import ErrorResponse
from app.schemas.reviews import ReviewInput, ReviewResponse, ReviewPage
from app.services import reviews

router = APIRouter(prefix="/api/users", tags=["reviews"], responses={
    status: {"model": ErrorResponse} for status in (401, 403, 404, 422, 503)
})


@router.put("/{user_id}/review", response_model=ReviewResponse, dependencies=[Depends(check_origin)])
async def save(user_id: UUID, data: ReviewInput, user: CurrentUser, db: DbSession):
    return await reviews.save_review(db, user, user_id, data)


@router.get("/{user_id}/review", response_model=ReviewResponse | None)
async def own(user_id: UUID, user: CurrentUser, db: DbSession):
    return await reviews.own_review(db, user, user_id)


@router.get("/{user_id}/reviews", response_model=ReviewPage)
async def collection(user_id: UUID, user: CurrentUser, db: DbSession,
                     limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    return await reviews.read_reviews(db, user_id, limit, offset)
