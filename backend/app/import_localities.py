"""Import a compact, preprocessed FIAS locality snapshot into PostgreSQL."""

import argparse
import asyncio
import gzip
import json
from datetime import date
from pathlib import Path

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import Settings
from app.models import Listing, Locality, User


DEFAULT_SOURCE = Path(__file__).with_name("data") / "localities.jsonl.gz"
BATCH_SIZE = 2_000


def read_metadata(source: Path) -> dict:
    with gzip.open(source, "rt", encoding="utf-8") as stream:
        first = json.loads(stream.readline())
    metadata = first.get("meta")
    if not metadata or "snapshotDate" not in metadata or "records" not in metadata:
        raise ValueError("First snapshot line must contain snapshotDate and records metadata")
    return metadata


def batches(source: Path):
    batch = []
    metadata = None
    with gzip.open(source, "rt", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            row = json.loads(line)
            if line_number == 1:
                metadata = row.get("meta")
                if not metadata:
                    raise ValueError("First snapshot line must contain metadata")
                continue
            batch.append(row)
            if len(batch) == BATCH_SIZE:
                yield metadata, batch
                batch = []
        if batch:
            yield metadata, batch


async def backfill_legacy_city_values(db) -> tuple[int, int]:
    updated_users = 0
    updated_listings = 0
    for model in (User, Listing):
        values = (await db.execute(
            select(model.city).where(model.locality_id.is_(None), model.city != "").distinct()
        )).scalars().all()
        for legacy_city in values:
            normalized = legacy_city.strip().casefold().replace("ё", "е")
            # Avoid a full-table fetch: compare the two canonical display forms.
            rows = (await db.execute(
                select(Locality).where(
                    Locality.is_active.is_(True),
                    (Locality.name.ilike(legacy_city.strip())) | (Locality.short_label.ilike(legacy_city.strip())),
                )
            )).scalars().all()
            rows = [row for row in rows if row.name.casefold().replace("ё", "е") == normalized
                    or row.short_label.casefold().replace("ё", "е") == normalized]
            if not rows:
                continue
            rows.sort(key=lambda row: (row.type_short != "г.", row.region_name, row.id.hex))
            chosen = rows[0]
            result = await db.execute(
                update(model).where(model.locality_id.is_(None), model.city == legacy_city)
                .values(locality_id=chosen.id, city=chosen.short_label)
            )
            if model is User:
                updated_users += result.rowcount
            else:
                updated_listings += result.rowcount
    return updated_users, updated_listings


async def import_snapshot(database_url: str, source: Path) -> dict[str, int | str | bool]:
    if not source.is_file():
        raise FileNotFoundError(f"Locality snapshot not found: {source}")
    engine = create_async_engine(database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    metadata = read_metadata(source)
    snapshot_date = date.fromisoformat(metadata["snapshotDate"])
    expected_records = int(metadata["records"])
    if expected_records < 1:
        raise ValueError("Locality snapshot must contain at least one record")
    imported = 0
    already_current = False
    try:
        async with session_factory() as db, db.begin():
            current_count, current_date = (await db.execute(
                select(func.count(Locality.id), func.max(Locality.snapshot_date))
                .where(Locality.is_active.is_(True))
            )).one()
            already_current = current_count == expected_records and current_date == snapshot_date
            if not already_current:
                await db.execute(update(Locality).values(is_active=False))
                for _, batch in batches(source):
                    values = [{**row, "snapshot_date": snapshot_date, "is_active": True} for row in batch]
                    statement = insert(Locality).values(values)
                    statement = statement.on_conflict_do_update(
                        index_elements=[Locality.id],
                        set_={column: getattr(statement.excluded, column) for column in (
                            "object_id", "name", "type_name", "type_short", "region_name",
                            "district_name", "short_label", "full_label", "search_name",
                            "is_active", "snapshot_date",
                        )},
                    )
                    await db.execute(statement)
                    imported += len(batch)
                if imported != expected_records:
                    raise ValueError(
                        f"Snapshot metadata declares {expected_records} records, imported {imported}"
                    )
            users, listings = await backfill_legacy_city_values(db)
        return {
            "localities": expected_records if already_current else imported,
            "catalogUpdated": not already_current,
            "usersBackfilled": users,
            "listingsBackfilled": listings,
            "snapshotDate": snapshot_date.isoformat(),
        }
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import the bundled official FIAS locality snapshot.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--confirm-official-snapshot", action="store_true")
    args = parser.parse_args()
    if not args.confirm_official_snapshot:
        parser.error("pass --confirm-official-snapshot to update the canonical locality catalog")
    settings = Settings()
    result = asyncio.run(import_snapshot(settings.database_url.get_secret_value(), args.source))
    print("Official FIAS locality snapshot imported: " + ", ".join(f"{key}={value}" for key, value in result.items()))


if __name__ == "__main__":
    main()
