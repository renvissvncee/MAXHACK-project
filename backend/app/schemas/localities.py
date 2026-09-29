from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class LocalityResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    id: UUID
    name: str
    type: str
    type_short: str
    region: str
    district: str | None
    short_label: str
    full_label: str

    @classmethod
    def from_locality(cls, row):
        return cls(
            id=row.id,
            name=row.name,
            type=row.type_name,
            type_short=row.type_short,
            region=row.region_name,
            district=row.district_name,
            short_label=row.short_label,
            full_label=row.full_label,
        )
