from datetime import datetime
from typing import Literal
from uuid import UUID
from app.schemas.profile import Contract


class NotificationResponse(Contract):
    id: UUID
    kind: Literal["request_created", "request_accepted", "request_declined", "review_created"]
    text: str
    target_type: Literal["request", "user_reviews"]
    target_id: UUID
    created_at: datetime
    read_at: datetime | None


class NotificationPage(Contract):
    unread_count: int
    items: list[NotificationResponse]
