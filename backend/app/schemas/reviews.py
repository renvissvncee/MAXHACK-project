from datetime import datetime
from uuid import UUID
from pydantic import Field
from app.schemas.profile import Contract
from app.schemas.listings import HostSummary


class ReviewInput(Contract):
    rating: int = Field(ge=1, le=5, strict=True)
    text: str = Field(default="", max_length=2000)


class ReviewResponse(ReviewInput):
    id: UUID
    subject_id: UUID
    author: HostSummary
    created_at: datetime
    updated_at: datetime


class ReviewPage(Contract):
    rating: float | None
    reviews_count: int
    items: list[ReviewResponse]
