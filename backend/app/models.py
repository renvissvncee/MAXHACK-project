from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKey, Index, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    max_user_id: Mapped[int] = mapped_column(BigInteger, unique=True)
    max_username: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(120), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    interests: Mapped[list[str]] = mapped_column(JSONB, default=list)
    avatar_emoji: Mapped[str] = mapped_column(String(32), default="👤")
    avatar_color: Mapped[str] = mapped_column(String(32), default="violet")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Session(Base):
    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint("guests >= 1 AND guests <= 8", name="ck_listings_guests"),
        CheckConstraint("available_to >= available_from", name="ck_listings_dates"),
        CheckConstraint("accommodation_type IN ('room', 'apartment', 'house', 'sofa')", name="ck_listings_type"),
        Index("ix_listings_city_dates", "city", "available_from", "available_to"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    city: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(120))
    short_description: Mapped[str] = mapped_column(String(240))
    description: Mapped[str] = mapped_column(Text)
    guests: Mapped[int] = mapped_column(SmallInteger)
    accommodation_type: Mapped[str] = mapped_column(String(16))
    available_from: Mapped[date] = mapped_column(Date)
    available_to: Mapped[date] = mapped_column(Date)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    amenities: Mapped[list[str]] = mapped_column(JSONB, default=list)
    rules: Mapped[list[str]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
