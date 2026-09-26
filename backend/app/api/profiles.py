from fastapi import APIRouter, Depends

from app.api.dependencies import CurrentUser, check_origin
from app.db import DbSession
from app.schemas.profile import ErrorResponse, ProfilePatch, ProfileResponse
from app.services.profiles import update_profile

router = APIRouter(prefix="/api", tags=["profile"],
                   responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse},
                              422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})


@router.get("/me", response_model=ProfileResponse)
async def me(user: CurrentUser):
    return ProfileResponse.from_user(user)


@router.patch("/me", response_model=ProfileResponse, dependencies=[Depends(check_origin)])
async def patch_me(body: ProfilePatch, user: CurrentUser, db: DbSession):
    return ProfileResponse.from_user(await update_profile(db, user, body))
