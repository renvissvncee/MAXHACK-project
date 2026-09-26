"""Add one accommodation offer per owner."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("listings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("city", sa.String(120), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("short_description", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("guests", sa.SmallInteger(), nullable=False),
        sa.Column("accommodation_type", sa.String(16), nullable=False),
        sa.Column("available_from", sa.Date(), nullable=False),
        sa.Column("available_to", sa.Date(), nullable=False),
        sa.Column("tags", postgresql.JSONB(), nullable=False),
        sa.Column("amenities", postgresql.JSONB(), nullable=False),
        sa.Column("rules", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("guests >= 1 AND guests <= 8", name="ck_listings_guests"),
        sa.CheckConstraint("available_to >= available_from", name="ck_listings_dates"),
        sa.CheckConstraint("accommodation_type IN ('room', 'apartment', 'house', 'sofa')", name="ck_listings_type"))
    op.create_index("ix_listings_city_dates", "listings", ["city", "available_from", "available_to"])


def downgrade():
    op.drop_table("listings")
