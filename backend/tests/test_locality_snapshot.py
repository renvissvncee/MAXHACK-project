import gzip
import json
from pathlib import Path


SNAPSHOT = Path(__file__).parents[1] / "app" / "data" / "localities.jsonl.gz"


def test_bundled_fias_snapshot_is_complete_and_unambiguous():
    with gzip.open(SNAPSHOT, "rt", encoding="utf-8") as stream:
        metadata = json.loads(next(stream))["meta"]
        rows = [json.loads(line) for line in stream]

    assert metadata["records"] == len(rows) == 160_430
    assert metadata["snapshotDate"] == "2026-09-24"
    assert len({row["id"] for row in rows}) == len(rows)
    assert len({row["object_id"] for row in rows}) == len(rows)
    assert len({row["full_label"] for row in rows}) == len(rows)
    cities = {row["name"] for row in rows if row["type_short"] == "г."}
    assert {"Москва", "Санкт-Петербург", "Казань", "Екатеринбург"} <= cities

