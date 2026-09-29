"""Listing photo (base64 data URL) and hard-delete cascading to its requests."""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("listings", sa.Column("photo_url", sa.Text(), nullable=True))
    op.drop_constraint("stay_requests_listing_id_fkey", "stay_requests", type_="foreignkey")
    op.create_foreign_key("stay_requests_listing_id_fkey", "stay_requests", "listings",
                          ["listing_id"], ["id"], ondelete="CASCADE")


def downgrade():
    op.drop_constraint("stay_requests_listing_id_fkey", "stay_requests", type_="foreignkey")
    op.create_foreign_key("stay_requests_listing_id_fkey", "stay_requests", "listings",
                          ["listing_id"], ["id"], ondelete="RESTRICT")
    op.drop_column("listings", "photo_url")
