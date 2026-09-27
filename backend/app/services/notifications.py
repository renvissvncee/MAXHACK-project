from uuid import uuid4
from sqlalchemy import select, func, update
from sqlalchemy.dialects.postgresql import insert
from app.models import Notification
from app.errors import AppError
from app.schemas.notifications import NotificationResponse, NotificationPage

TEXTS = {
    "request_created": "В Приюте появился новый запрос на общение. Откройте приложение, чтобы посмотреть его.",
    "request_accepted": "Ваш запрос в Приюте принят. Контакт собеседника доступен в приложении.",
    "request_declined": "Ваш запрос в Приюте отклонён. Вы можете посмотреть другие предложения.",
    "review_created": "О вас оставили отзыв об общении в Приюте. Посмотреть его можно в приложении.",
}


async def enqueue(db, recipient_id, kind, event_key, target_id):
    """Part of the caller's transaction: never commit separately from the event."""
    if kind not in TEXTS:
        raise ValueError("Unknown notification kind")
    await db.execute(insert(Notification).values(
        id=uuid4(), recipient_id=recipient_id, kind=kind, event_key=event_key,
        target_id=target_id, delivery_status="pending", attempts=0,
    ).on_conflict_do_nothing(index_elements=[Notification.event_key]))


def response(row):
    return NotificationResponse(id=row.id, kind=row.kind, text=TEXTS[row.kind],
        target_type="user_reviews" if row.kind == "review_created" else "request",
        target_id=row.target_id, created_at=row.created_at, read_at=row.read_at)


async def list_notifications(db, user, unread_only, limit, offset):
    query = select(Notification).where(Notification.recipient_id == user.id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    rows = (await db.execute(query.order_by(Notification.created_at.desc(), Notification.id)
                            .limit(limit).offset(offset))).scalars().all()
    count = await db.scalar(select(func.count()).select_from(Notification).where(
        Notification.recipient_id == user.id, Notification.read_at.is_(None)))
    return NotificationPage(unread_count=count, items=[response(row) for row in rows])


async def mark_read(db, user, notification_id):
    row = (await db.execute(update(Notification).where(Notification.id == notification_id,
        Notification.recipient_id == user.id).values(read_at=func.coalesce(Notification.read_at, func.now()))
        .returning(Notification))).scalar_one_or_none()
    if row is None:
        raise AppError("notification_not_found", "Уведомление не найдено.", 404)
    result = response(row)
    await db.commit()
    return result


async def get_notification(db, user, notification_id):
    row = await db.scalar(select(Notification).where(Notification.id == notification_id,
                                                    Notification.recipient_id == user.id))
    if row is None:
        raise AppError("notification_not_found", "Уведомление не найдено.", 404)
    return response(row)
