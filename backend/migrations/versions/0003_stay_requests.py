"""Requests for communication; acceptance is not a reservation."""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("stay_requests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("client_request_id", sa.Uuid(), nullable=False),
        sa.Column("listing_id", sa.Uuid(), sa.ForeignKey("listings.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("guest_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("host_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("date_from", sa.Date(), nullable=False),
        sa.Column("date_to", sa.Date(), nullable=False),
        sa.Column("guests", sa.SmallInteger(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("guest_id <> host_id", name="ck_requests_participants"),
        sa.CheckConstraint("date_to >= date_from", name="ck_requests_dates"),
        sa.CheckConstraint("guests BETWEEN 1 AND 8", name="ck_requests_guests"),
        sa.CheckConstraint("status IN ('pending', 'accepted', 'declined')", name="ck_requests_status"),
        sa.CheckConstraint("(status = 'pending' AND decided_at IS NULL) OR (status <> 'pending' AND decided_at IS NOT NULL)", name="ck_requests_decision"))
    op.create_index("uq_request_guest_client", "stay_requests", ["guest_id", "client_request_id"], unique=True)
    op.create_index("ix_requests_host_created", "stay_requests", ["host_id", "created_at"])
    op.create_index("ix_requests_guest_created", "stay_requests", ["guest_id", "created_at"])


def downgrade():
    op.drop_table("stay_requests")
