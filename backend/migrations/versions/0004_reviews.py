"""One editable review per author and subject after a match."""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("reviews",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subject_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("author_id <> subject_id", name="ck_reviews_participants"),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating"))
    op.create_index("uq_reviews_author_subject", "reviews", ["author_id", "subject_id"], unique=True)
    op.create_index("ix_reviews_subject_created", "reviews", ["subject_id", "created_at"])


def downgrade():
    op.drop_table("reviews")
