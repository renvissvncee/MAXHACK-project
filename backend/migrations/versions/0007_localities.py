"""Canonical FIAS localities for profile, listing and search."""

from alembic import op
import sqlalchemy as sa


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "localities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("object_id", sa.BigInteger(), nullable=False, unique=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("type_name", sa.String(80), nullable=False),
        sa.Column("type_short", sa.String(24), nullable=False),
        sa.Column("region_name", sa.String(160), nullable=False),
        sa.Column("district_name", sa.String(240)),
        sa.Column("short_label", sa.String(200), nullable=False),
        sa.Column("full_label", sa.String(500), nullable=False),
        sa.Column("search_name", sa.String(700), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
    )
    op.create_index(
        "ix_localities_search_name", "localities", ["search_name"],
        postgresql_ops={"search_name": "varchar_pattern_ops"},
    )
    op.create_index("ix_localities_name_region", "localities", ["name", "region_name"])
    op.add_column("users", sa.Column("locality_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("users_locality_id_fkey", "users", "localities", ["locality_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_users_locality_id", "users", ["locality_id"])
    op.add_column("listings", sa.Column("locality_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("listings_locality_id_fkey", "listings", "localities", ["locality_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_listings_locality_id", "listings", ["locality_id"])
    op.create_index("ix_listings_locality_dates", "listings", ["locality_id", "available_from", "available_to"])


def downgrade():
    op.drop_index("ix_listings_locality_dates", table_name="listings")
    op.drop_index("ix_listings_locality_id", table_name="listings")
    op.drop_constraint("listings_locality_id_fkey", "listings", type_="foreignkey")
    op.drop_column("listings", "locality_id")
    op.drop_index("ix_users_locality_id", table_name="users")
    op.drop_constraint("users_locality_id_fkey", "users", type_="foreignkey")
    op.drop_column("users", "locality_id")
    op.drop_table("localities")
