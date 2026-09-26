from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import Field, StringConstraints, model_validator

from app.schemas.profile import Contract

Text = Annotated[str, StringConstraints(min_length=1, max_length=120)]
Item = Annotated[str, StringConstraints(min_length=1, max_length=80)]


class ListingInput(Contract):
    city: Text
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

    @model_validator(mode="after")
    def valid_dates_and_dedupe(self):
        if self.available_to < self.available_from:
            raise ValueError("availableTo must be on or after availableFrom")
        for field in ("tags", "amenities", "rules"):
            setattr(self, field, list(dict.fromkeys(getattr(self, field))))
        return self


class HostSummary(Contract):
    id: UUID
    name: str
    city: str
    bio: str
    interests: list[str]
    avatar_emoji: str
    avatar_color: str
    photo_url: str | None


class ListingResponse(Contract):
    id: UUID
    host: HostSummary
    city: str
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
                             avatar_color=host.avatar_color, photo_url=host.photo_url),
            city=listing.city, title=listing.title, short_description=listing.short_description,
            description=listing.description, guests=listing.guests,
            accommodation_type=listing.accommodation_type, available_from=listing.available_from,
            available_to=listing.available_to, tags=listing.tags, amenities=listing.amenities,
            rules=listing.rules, rating=None, reviews_count=0, photos=[])


class MyListingResponse(Contract):
    listing: ListingResponse | None
