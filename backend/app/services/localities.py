import re
from uuid import UUID

from sqlalchemy import case, func, select

from app.errors import AppError
from app.models import Locality


def normalize_locality_query(value: str) -> str:
    value = value.casefold().replace("ё", "е")
    return " ".join(re.findall(r"[0-9a-zа-я]+", value))


async def suggest_localities(db, query: str, limit: int):
    normalized = normalize_locality_query(query)
    if len(normalized) < 2:
        return []
    exact = case((func.lower(func.replace(Locality.name, "ё", "е")) == normalized, 0), else_=1)
    rows = (await db.execute(
        select(Locality)
        .where(Locality.is_active.is_(True), Locality.search_name.like(f"{normalized}%"))
        .order_by(exact, Locality.name, Locality.region_name, Locality.district_name, Locality.id)
        .limit(limit)
    )).scalars().all()
    return rows


async def require_locality(db, locality_id: UUID) -> Locality:
    locality = await db.get(Locality, locality_id)
    if locality is None or not locality.is_active:
        raise AppError("locality_not_found", "Выберите населённый пункт из списка.", 422)
    return locality
