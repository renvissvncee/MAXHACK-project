from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Locality(Base):
    __tablename__ = "localities"
    __table_args__ = (
        Index("ix_localities_search_name", "search_name", postgresql_ops={"search_name": "varchar_pattern_ops"}),
        Index("ix_localities_name_region", "name", "region_name"),
    )

    # The canonical FIAS OBJECTGUID is stable and doubles as our public id.
    id: Mapped[UUID] = mapped_column(primary_key=True)
    object_id: Mapped[int] = mapped_column(BigInteger, unique=True)
    name: Mapped[str] = mapped_column(String(160))
    type_name: Mapped[str] = mapped_column(String(80))
    type_short: Mapped[str] = mapped_column(String(24))
    region_name: Mapped[str] = mapped_column(String(160))
    district_name: Mapped[str | None] = mapped_column(String(240))
    short_label: Mapped[str] = mapped_column(String(200))
    full_label: Mapped[str] = mapped_column(String(500))
    search_name: Mapped[str] = mapped_column(String(700))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    snapshot_date: Mapped[date] = mapped_column(Date)


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
    locality_id: Mapped[UUID | None] = mapped_column(ForeignKey("localities.id", ondelete="RESTRICT"), index=True)
    locality: Mapped[Locality | None] = relationship(lazy="selectin")
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
        Index("ix_listings_locality_dates", "locality_id", "available_from", "available_to"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    locality_id: Mapped[UUID | None] = mapped_column(ForeignKey("localities.id", ondelete="RESTRICT"), index=True)
    locality: Mapped[Locality | None] = relationship(lazy="selectin")
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
    # A single photo stored as a base64 data URL — there is no object
    # storage on the deploy host, only Postgres, and the size is capped in
    # ListingInput (see schemas/listings.py) to keep rows reasonable.
    photo_url: Mapped[str | None] = mapped_column(Text)
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
    # CASCADE, not RESTRICT: the host can hard-delete their listing, and the
    # frontend warns them up front that any requests against it go with it.
    listing_id: Mapped[UUID] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"))
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
