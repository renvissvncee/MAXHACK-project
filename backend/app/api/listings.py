from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import CurrentUser, check_origin
from app.db import DbSession
from app.errors import AppError
from app.schemas.listings import ListingInput, ListingResponse, MyListingResponse
from app.schemas.profile import ErrorResponse
from app.services.listings import get_listing, get_my_listing, save_listing, search_listings

router = APIRouter(prefix="/api", tags=["listings"],
                   responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse},
                              409: {"model": ErrorResponse}, 422: {"model": ErrorResponse},
                              503: {"model": ErrorResponse}})


@router.put("/me/listing", response_model=ListingResponse, dependencies=[Depends(check_origin)])
async def put_my_listing(data: ListingInput, user: CurrentUser, db: DbSession):
    """Create the user's single offer, or replace its editable fields."""
    return await save_listing(db, user, data)


@router.get("/me/listing", response_model=MyListingResponse)
async def read_my_listing(user: CurrentUser, db: DbSession):
    return MyListingResponse(listing=await get_my_listing(db, user))


@router.get("/listings", response_model=list[ListingResponse])
async def list_listings(
    user: CurrentUser, db: DbSession,
    city: str | None = Query(default=None, min_length=1, max_length=120),
    date_from: date | None = None,
    date_to: date | None = None,
    guests: int = Query(default=1, ge=1, le=8),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    if (date_from is None) != (date_to is None):
        raise AppError("invalid_date_range", "Укажите обе даты поездки.", 422)
    if date_from and date_to and date_to < date_from:
        raise AppError("invalid_date_range", "Дата окончания должна быть не раньше даты начала.", 422)
    return await search_listings(db, user, city.strip() if city and city.strip() else None, date_from, date_to,
                                 guests, limit, offset)


@router.get("/listings/{listing_id}", response_model=ListingResponse,
            responses={404: {"model": ErrorResponse}})
async def read_listing(listing_id: UUID, user: CurrentUser, db: DbSession):
    return await get_listing(db, listing_id, user)
