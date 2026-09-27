from datetime import date, datetime
from typing import Literal
from uuid import UUID
from pydantic import Field, model_validator
from app.schemas.profile import Contract
from app.schemas.listings import HostSummary


class RequestInput(Contract):
    client_request_id: UUID
    listing_id: UUID
    date_from: date
    date_to: date
    guests: int = Field(ge=1, le=8)
    message: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def valid_dates(self):
        if self.date_to < self.date_from:
            raise ValueError("dateTo must be on or after dateFrom")
        return self


class RequestDecision(Contract):
    status: Literal["accepted", "declined"]


class RequestResponse(RequestInput):
    id: UUID
    status: Literal["pending", "accepted", "declined"]
    created_at: datetime
    decided_at: datetime | None
    guest: HostSummary
    host: HostSummary


class ContactResponse(Contract):
    user_id: UUID
    max_user_id: str  # JS cannot safely represent every 64-bit integer.
    username: str | None
