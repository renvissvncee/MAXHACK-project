from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
from pydantic.alias_generators import to_camel


class Contract(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid", str_strip_whitespace=True)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    initData: str = Field(min_length=1, max_length=16384)


Name = Annotated[str, StringConstraints(min_length=1, max_length=120)]
Interest = Annotated[str, StringConstraints(min_length=1, max_length=50)]


class ProfilePatch(Contract):
    name: Name | None = None
    city: Name | None = None
    bio: str | None = Field(default=None, max_length=2000)
    interests: list[Interest] | None = Field(default=None, max_length=20)
    avatar_emoji: str | None = Field(default=None, min_length=1, max_length=32)
    avatar_color: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_-]{1,32}$")

    @model_validator(mode="after")
    def no_explicit_null(self):
        if not self.model_fields_set or any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("Provide at least one non-null profile field")
        if self.interests is not None:
            self.interests = list(dict.fromkeys(self.interests))
        return self


class ProfileResponse(Contract):
    id: UUID
    name: str
    city: str
    bio: str
    interests: list[str]
    avatar_emoji: str
    avatar_color: str
    photo_url: str | None
    created_at: datetime
    profile_completed: bool

    @classmethod
    def from_user(cls, user):
        return cls(
            id=user.id, name=user.name, city=user.city, bio=user.bio,
            interests=user.interests, avatar_emoji=user.avatar_emoji,
            avatar_color=user.avatar_color, photo_url=user.photo_url,
            created_at=user.created_at,
            profile_completed=bool(user.name and user.city and user.interests),
        )


class LoginResponse(ProfileResponse):
    session_token: str = Field(min_length=32, max_length=128)

    @classmethod
    def from_login(cls, user, token: str):
        return cls(**ProfileResponse.from_user(user).model_dump(), session_token=token)


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
