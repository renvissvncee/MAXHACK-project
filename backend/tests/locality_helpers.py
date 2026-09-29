import asyncio
from datetime import date
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import create_async_engine

from app.models import Locality


def locality_id(name: str):
    return uuid5(NAMESPACE_URL, f"priut-test-locality:{name}")


def locality_patch(locality_name: str, **fields):
    return {"localityId": str(locality_id(locality_name)), **fields}


def ensure_localities(database_url: str, *names: str) -> None:
    async def create():
        engine = create_async_engine(database_url)
        async with engine.begin() as connection:
            for name in names:
                label = name.removeprefix("г. ")
                values = dict(
                    id=locality_id(name), object_id=-(locality_id(name).int % (2**62)),
                    name=label, type_name="Город", type_short="г.",
                    region_name="Тестовый регион", district_name=None,
                    short_label=label, full_label=f"{label}, Тестовый регион",
                    search_name=f"{label.casefold()} г тестовый регион",
                    is_active=True, snapshot_date=date(2026, 9, 24),
                )
                statement = insert(Locality).values(**values).on_conflict_do_nothing(index_elements=[Locality.id])
                await connection.execute(statement)
        await engine.dispose()

    asyncio.run(create())
