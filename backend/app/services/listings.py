from datetime import date
from uuid import uuid4

from sqlalchemy import case, delete, select
from sqlalchemy.dialects.postgresql import insert

from app.services.reviews import reputation_map
from app.errors import AppError
from app.models import Listing, User
from app.schemas.listings import ListingInput, ListingResponse
from app.services.localities import require_locality


async def save_listing(db, owner: User, data: ListingInput) -> ListingResponse:
    if not owner.locality_id or not owner.interests:
        raise AppError("profile_incomplete", "Сначала заполните профиль: город и интересы.", 409)
    values = data.model_dump()
    locality = await require_locality(db, values["locality_id"])
    values["city"] = locality.short_label
    listing_id = uuid4()
    statement = insert(Listing).values(id=listing_id, owner_id=owner.id, **values).on_conflict_do_update(
        index_elements=[Listing.owner_id],
        set_={**values},
    ).returning(Listing)
    listing = (await db.execute(statement)).scalar_one()
    listing.locality = locality
    await db.commit()
    return await with_reputation(db, listing, owner)


async def get_my_listing(db, owner: User) -> ListingResponse | None:
    listing = (await db.execute(select(Listing).where(Listing.owner_id == owner.id))).scalar_one_or_none()
    return await with_reputation(db, listing, owner) if listing else None


async def delete_my_listing(db, owner: User) -> None:
    """Hard-delete the owner's listing. Cascades to its stay_requests by FK
    (ON DELETE CASCADE) — the frontend warns the host about this up front."""
    result = await db.execute(delete(Listing).where(Listing.owner_id == owner.id).returning(Listing.id))
    if result.first() is None:
        raise AppError("listing_not_found", "Предложение не найдено.", 404)
    await db.commit()


async def search_listings(db, viewer: User, locality_id, date_from: date | None,
                          date_to: date | None, guests: int, accommodation_type: str | None,
                          limit: int, offset: int):
    if locality_id:
        await require_locality(db, locality_id)
    statement = select(Listing, User).join(User, User.id == Listing.owner_id).where(
        Listing.owner_id != viewer.id,
        Listing.guests >= guests,
    )
    if locality_id:
        statement = statement.where(Listing.locality_id == locality_id)
    if accommodation_type:
        statement = statement.where(Listing.accommodation_type == accommodation_type)
    if date_from:
        statement = statement.where(Listing.available_from <= date_from)
    if date_to:
        statement = statement.where(Listing.available_to >= date_to)
    if locality_id:
        # An explicit city search is already as relevant as it gets — newest first.
        statement = statement.order_by(Listing.created_at.desc(), Listing.id)
    else:
        # Nothing to rank by but "how relevant is this to the viewer" — a
        # listing in the viewer's own city is the closest proxy for
        # relevance we have without real geolocation, so surface those
        # first and fall back to recency within each group.
        statement = statement.order_by(
            case((Listing.locality_id == viewer.locality_id, 0), else_=1),
            Listing.created_at.desc(), Listing.id,
        )
    statement = statement.limit(limit).offset(offset)
    rows = (await db.execute(statement)).all()
    stats = await reputation_map(db, [owner.id for _, owner in rows])
    return [ListingResponse.from_listing(listing, owner).model_copy(update={"rating": stats.get(owner.id, (None, 0))[0], "reviews_count": stats.get(owner.id, (None, 0))[1]}) for listing, owner in rows]


async def get_listing(db, listing_id, viewer: User):
    result = (await db.execute(select(Listing, User).join(User, User.id == Listing.owner_id)
                               .where(Listing.id == listing_id, Listing.owner_id != viewer.id))).one_or_none()
    if result is None:
        raise AppError("listing_not_found", "Предложение не найдено.", 404)
    return await with_reputation(db, *result)


async def with_reputation(db, listing, owner):
    rating, count = (await reputation_map(db, [owner.id])).get(owner.id, (None, 0))
    return ListingResponse.from_listing(listing, owner).model_copy(update={"rating": rating, "reviews_count": count})
