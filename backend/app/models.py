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


class StayRequest(Base):
    __tablename__ = "stay_requests"
    __table_args__ = (
        Index("uq_request_guest_client", "guest_id", "client_request_id", unique=True),
        Index("ix_requests_host_created", "host_id", "created_at"),
        Index("ix_requests_guest_created", "guest_id", "created_at"),
        CheckConstraint("guest_id <> host_id", name="ck_requests_participants"),
        CheckConstraint("date_to >= date_from", name="ck_requests_dates"),
        CheckConstraint("guests BETWEEN 1 AND 8", name="ck_requests_guests"),
        CheckConstraint("status IN ('pending', 'accepted', 'declined')", name="ck_requests_status"),
        CheckConstraint("(status = 'pending' AND decided_at IS NULL) OR (status <> 'pending' AND decided_at IS NOT NULL)", name="ck_requests_decision"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    client_request_id: Mapped[UUID] = mapped_column()
    listing_id: Mapped[UUID] = mapped_column(ForeignKey("listings.id", ondelete="RESTRICT"))
    guest_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    host_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    date_from: Mapped[date] = mapped_column(Date)
    date_to: Mapped[date] = mapped_column(Date)
    guests: Mapped[int] = mapped_column(SmallInteger)
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        Index("uq_reviews_author_subject", "author_id", "subject_id", unique=True),
        Index("ix_reviews_subject_created", "subject_id", "created_at"),
        CheckConstraint("author_id <> subject_id", name="ck_reviews_participants"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    author_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    subject_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    rating: Mapped[int] = mapped_column(SmallInteger)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("uq_notifications_event", "event_key", unique=True),
        Index("ix_notifications_recipient_created", "recipient_id", "created_at"),
        Index("ix_notifications_delivery", "delivery_status", "next_attempt_at"),
        CheckConstraint("delivery_status IN ('pending', 'sending', 'sent', 'failed')", name="ck_notifications_status"),
        CheckConstraint("kind IN ('request_created', 'request_accepted', 'request_declined', 'review_created')", name="ck_notifications_kind"),
        CheckConstraint("attempts >= 0", name="ck_notifications_attempts"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    recipient_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    event_key: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(32))
    target_id: Mapped[UUID] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivery_status: Mapped[str] = mapped_column(String(16), default="pending")
    attempts: Mapped[int] = mapped_column(SmallInteger, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[UUID | None] = mapped_column()
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(String(80))
    max_message_id: Mapped[str | None] = mapped_column(String(255))
