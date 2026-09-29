import re
from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import Field, StringConstraints, model_validator

from app.schemas.profile import Contract
from app.schemas.localities import LocalityResponse

Text = Annotated[str, StringConstraints(min_length=1, max_length=120)]
Item = Annotated[str, StringConstraints(min_length=1, max_length=80)]

# No object storage on the deploy host — the photo is a base64 data URL
# stored directly in Postgres. The frontend resizes/compresses before
# sending; this cap (~512KB decoded) just guards the server independently
# of what the client claims to have done.
PHOTO_URL_MAX_LENGTH = 700_000
PHOTO_URL_PATTERN = re.compile(r"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$")


class ListingInput(Contract):
    locality_id: UUID
    title: Text
    short_description: str = Field(min_length=1, max_length=240)
    description: str = Field(min_length=1, max_length=4000)
    guests: int = Field(ge=1, le=8)
    accommodation_type: str = Field(pattern=r"^(room|apartment|house|sofa)$")
    available_from: date
    available_to: date
    tags: list[Item] = Field(default_factory=list, max_length=12)
    amenities: list[Item] = Field(default_factory=list, max_length=20)
    rules: list[Item] = Field(default_factory=list, max_length=20)
    photo_url: str | None = Field(default=None, max_length=PHOTO_URL_MAX_LENGTH)

    @model_validator(mode="after")
    def valid_dates_and_dedupe(self):
        if self.available_from < date.today():
            raise ValueError("availableFrom must be today or later")
        if self.available_to < self.available_from:
            raise ValueError("availableTo must be on or after availableFrom")
        for field in ("tags", "amenities", "rules"):
            setattr(self, field, list(dict.fromkeys(getattr(self, field))))
        if self.photo_url is not None and not PHOTO_URL_PATTERN.match(self.photo_url):
            raise ValueError("photoUrl must be a base64 png/jpeg/webp data URL")
        return self


class HostSummary(Contract):
    id: UUID
    name: str
    city: str
    locality: LocalityResponse | None
    bio: str
    interests: list[str]
    avatar_emoji: str
    avatar_color: str
    photo_url: str | None


class ListingResponse(Contract):
    id: UUID
    host: HostSummary
    city: str
    locality_id: UUID | None
    locality: LocalityResponse | None
    title: str
    short_description: str
    description: str
    guests: int
    accommodation_type: str
    available_from: date
    available_to: date
    tags: list[str]
    amenities: list[str]
    rules: list[str]
    rating: float | None
    reviews_count: int
    photos: list[str]

    @classmethod
    def from_listing(cls, listing, host):
        return cls(
            id=listing.id,
            host=HostSummary(id=host.id, name=host.name, city=host.city, bio=host.bio,
                             interests=host.interests, avatar_emoji=host.avatar_emoji,
                             avatar_color=host.avatar_color, photo_url=host.photo_url,
                             locality=LocalityResponse.from_locality(host.locality) if host.locality else None),
            city=listing.city, locality_id=listing.locality_id,
            locality=LocalityResponse.from_locality(listing.locality) if listing.locality else None,
            title=listing.title, short_description=listing.short_description,
            description=listing.description, guests=listing.guests,
            accommodation_type=listing.accommodation_type, available_from=listing.available_from,
            available_to=listing.available_to, tags=listing.tags, amenities=listing.amenities,
            rules=listing.rules, rating=None, reviews_count=0,
            photos=[listing.photo_url] if listing.photo_url else [])


class MyListingResponse(Contract):
    listing: ListingResponse | None
