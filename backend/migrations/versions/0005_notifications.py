"""Durable inbox and MAX delivery outbox."""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recipient_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_key", sa.String(160), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("delivery_status", sa.String(16), nullable=False),
        sa.Column("attempts", sa.SmallInteger(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("lease_token", sa.Uuid()),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("last_error", sa.String(80)),
        sa.Column("max_message_id", sa.String(255)),
        sa.CheckConstraint("delivery_status IN ('pending', 'sending', 'sent', 'failed')", name="ck_notifications_status"),
        sa.CheckConstraint("kind IN ('request_created', 'request_accepted', 'request_declined', 'review_created')", name="ck_notifications_kind"),
        sa.CheckConstraint("attempts >= 0", name="ck_notifications_attempts"))
    op.create_index("uq_notifications_event", "notifications", ["event_key"], unique=True)
    op.create_index("ix_notifications_recipient_created", "notifications", ["recipient_id", "created_at"])
    op.create_index("ix_notifications_delivery", "notifications", ["delivery_status", "next_attempt_at"])


def downgrade():
    op.drop_table("notifications")
