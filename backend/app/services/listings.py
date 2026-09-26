from datetime import date
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.errors import AppError
from app.models import Listing, User
from app.schemas.listings import ListingInput, ListingResponse


async def save_listing(db, owner: User, data: ListingInput) -> ListingResponse:
    if not owner.city or not owner.interests:
        raise AppError("profile_incomplete", "Сначала заполните профиль: город и интересы.", 409)
    values = data.model_dump()
    listing_id = uuid4()
    statement = insert(Listing).values(id=listing_id, owner_id=owner.id, **values).on_conflict_do_update(
        index_elements=[Listing.owner_id],
        set_={**values},
    ).returning(Listing)
    listing = (await db.execute(statement)).scalar_one()
    await db.commit()
    return ListingResponse.from_listing(listing, owner)


async def get_my_listing(db, owner: User) -> ListingResponse | None:
    listing = (await db.execute(select(Listing).where(Listing.owner_id == owner.id))).scalar_one_or_none()
    return ListingResponse.from_listing(listing, owner) if listing else None


async def search_listings(db, viewer: User, city: str | None, date_from: date | None,
                          date_to: date | None, guests: int, limit: int, offset: int):
    statement = select(Listing, User).join(User, User.id == Listing.owner_id).where(
        Listing.owner_id != viewer.id,
        Listing.guests >= guests,
    )
    if city:
        statement = statement.where(func.lower(Listing.city) == city.casefold())
    if date_from:
        statement = statement.where(Listing.available_from <= date_from)
    if date_to:
        statement = statement.where(Listing.available_to >= date_to)
    statement = statement.order_by(Listing.created_at.desc(), Listing.id).limit(limit).offset(offset)
    rows = (await db.execute(statement)).all()
    return [ListingResponse.from_listing(listing, owner) for listing, owner in rows]


async def get_listing(db, listing_id, viewer: User):
    result = (await db.execute(select(Listing, User).join(User, User.id == Listing.owner_id)
                               .where(Listing.id == listing_id, Listing.owner_id != viewer.id))).one_or_none()
    if result is None:
        raise AppError("listing_not_found", "Предложение не найдено.", 404)
    return ListingResponse.from_listing(*result)
