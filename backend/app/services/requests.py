import logging
from datetime import datetime, timezone
from sqlalchemy import select, or_
from app.errors import AppError
from app.models import StayRequest, Listing, User
from app.schemas.listings import HostSummary
from app.schemas.localities import LocalityResponse
from app.schemas.requests import RequestInput, RequestResponse, ContactResponse

from app.services.notifications import enqueue

logger = logging.getLogger(__name__)


def public_profile(user):
    return HostSummary(
        **{key: getattr(user, key) for key in HostSummary.model_fields if key != "locality"},
        locality=LocalityResponse.from_locality(user.locality) if user.locality else None,
    )


async def response(db, row):
    guest = await db.get(User, row.guest_id)
    host = await db.get(User, row.host_id)
    return RequestResponse(**{key: getattr(row, key) for key in RequestInput.model_fields},
                           id=row.id, status=row.status, created_at=row.created_at, decided_at=row.decided_at,
                           guest=public_profile(guest), host=public_profile(host))


async def create_request(db, guest, data):
    # Serialise submissions by this user, including concurrent retries of a client ID.
    await db.execute(select(User.id).where(User.id == guest.id).with_for_update())
    existing = (await db.execute(select(StayRequest).where(
        StayRequest.guest_id == guest.id, StayRequest.client_request_id == data.client_request_id))).scalar_one_or_none()
    if existing:
        if any(getattr(existing, key) != value for key, value in data.model_dump().items()):
            raise AppError("idempotency_conflict", "Этот идентификатор уже использован с другими данными.", 409)
        result = await response(db, existing)
        await db.commit()
        return result
    if not guest.locality_id or not guest.interests:
        raise AppError("profile_incomplete", "Сначала заполните профиль: город и интересы.", 409)
    offer = (await db.execute(select(Listing).where(Listing.id == data.listing_id).with_for_update())).scalar_one_or_none()
    if offer is None or offer.owner_id == guest.id:
        raise AppError("listing_not_found", "Предложение не найдено.", 404)
    if data.guests > offer.guests or data.date_from < offer.available_from or data.date_to > offer.available_to:
        raise AppError("trip_not_available", "Проверьте даты и количество гостей в предложении.", 409)
    row = StayRequest(guest_id=guest.id, host_id=offer.owner_id, **data.model_dump())
    db.add(row)
    await db.flush()
    await enqueue(db, row.host_id, "request_created", f"request_created:{row.id}", row.id)
    result = await response(db, row)
    await db.commit()
    logger.info("stay_request_created request_id=%s", row.id)
    return result


async def participant_request(db, user, request_id, lock=False):
    query = select(StayRequest).where(StayRequest.id == request_id,
                                     or_(StayRequest.guest_id == user.id, StayRequest.host_id == user.id))
    if lock:
        query = query.with_for_update()
    row = (await db.execute(query)).scalar_one_or_none()
    if row is None:
        raise AppError("request_not_found", "Запрос не найден.", 404)
    return row


async def decide_request(db, host, request_id, status):
    row = await participant_request(db, host, request_id, lock=True)
    if row.host_id != host.id:
        raise AppError("host_only", "Решение принимает хозяин предложения.", 403)
    if row.status not in ("pending", status):
        raise AppError("request_already_decided", "По запросу уже принято другое решение.", 409)
    changed = row.status == "pending"
    if changed:
        row.status = status
        row.decided_at = datetime.now(timezone.utc)
        await enqueue(db, row.guest_id, f"request_{status}", f"request_decided:{row.id}", row.id)
    result = await response(db, row)
    await db.commit()
    if changed:
        logger.info("stay_request_decided request_id=%s status=%s", row.id, status)
    return result


async def list_requests(db, user, direction, limit, offset):
    participant = StayRequest.host_id if direction == "incoming" else StayRequest.guest_id
    rows = (await db.execute(select(StayRequest).where(participant == user.id)
                            .order_by(StayRequest.created_at.desc(), StayRequest.id).limit(limit).offset(offset))).scalars().all()
    return [await response(db, row) for row in rows]


async def get_contact(db, user, request_id):
    row = await participant_request(db, user, request_id)
    if row.status != "accepted":
        raise AppError("match_required", "Контакт доступен после принятия запроса.", 403)
    other = await db.get(User, row.host_id if user.id == row.guest_id else row.guest_id)
    return ContactResponse(user_id=other.id, max_user_id=str(other.max_user_id), username=other.max_username)
