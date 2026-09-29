#!/usr/bin/env python3
"""Build a compact locality JSONL snapshot from the official FIAS ZIP.

The full open-data archive is tens of gigabytes because it also contains
houses, rooms and parameters. This script uses HTTP Range requests and reads
only address objects plus administrative hierarchy members.
"""

import argparse
from collections import Counter
import gzip
import io
import json
import re
import struct
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import zlib
from pathlib import Path
from uuid import UUID

import truststore


DEFAULT_URL = "https://fias.nalog.ru/opendata/7707329152-fias/data-25092026-structure-20191024.zip"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "backend" / "app" / "data" / "localities.jsonl.gz"
SNAPSHOT_DATE = "2026-09-24"
ADDR_OBJECT = re.compile(r"^(\d{2})/AS_ADDR_OBJ_\d.*\.XML$", re.IGNORECASE)
ADM_HIERARCHY = re.compile(r"^(\d{2})/AS_ADM_HIERARCHY_\d.*\.XML$", re.IGNORECASE)
LOCALITY_LEVELS = {5, 6}
PARENT_LEVELS = {2, 3, 4}


class RemoteZipFile(io.RawIOBase):
    """Minimal seekable HTTP Range reader used only for ZIP metadata."""

    def __init__(self, url: str):
        self.url = url
        request = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(request, timeout=60) as response:
            self.length = int(response.headers["Content-Length"])
        self.position = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            self.position = offset
        elif whence == io.SEEK_CUR:
            self.position += offset
        elif whence == io.SEEK_END:
            self.position = self.length + offset
        return self.position

    def readinto(self, target):
        if self.position >= self.length:
            return 0
        end = min(self.length - 1, self.position + len(target) - 1)
        request = urllib.request.Request(self.url, headers={"Range": f"bytes={self.position}-{end}"})
        with urllib.request.urlopen(request, timeout=120) as response:
            data = response.read()
        target[:len(data)] = data
        self.position += len(data)
        return len(data)


def entry_data_offset(url: str, info: zipfile.ZipInfo) -> int:
    request = urllib.request.Request(url, headers={"Range": f"bytes={info.header_offset}-{info.header_offset + 29}"})
    with urllib.request.urlopen(request, timeout=60) as response:
        header = response.read(30)
    if len(header) != 30 or header[:4] != b"PK\x03\x04":
        raise ValueError(f"Invalid local ZIP header for {info.filename}")
    fields = struct.unpack("<4s5H3L2H", header)
    return info.header_offset + 30 + fields[-2] + fields[-1]


def parse_member(url: str, info: zipfile.ZipInfo, element_name: str, callback) -> None:
    offset = entry_data_offset(url, info)
    end = offset + info.compress_size - 1
    request = urllib.request.Request(url, headers={"Range": f"bytes={offset}-{end}"})
    parser = ET.XMLPullParser(events=("end",))
    decompressor = zlib.decompressobj(-15) if info.compress_type == zipfile.ZIP_DEFLATED else None
    with urllib.request.urlopen(request, timeout=300) as response:
        while chunk := response.read(1024 * 1024):
            parser.feed(decompressor.decompress(chunk) if decompressor else chunk)
            for _, element in parser.read_events():
                if element.tag == element_name:
                    callback(element.attrib)
                element.clear()
        if decompressor:
            parser.feed(decompressor.flush())
        for _, element in parser.read_events():
            if element.tag == element_name:
                callback(element.attrib)
            element.clear()


def normalized(*parts: str | None) -> str:
    text = " ".join(part for part in parts if part).casefold().replace("ё", "е")
    return " ".join(re.findall(r"[0-9a-zа-я]+", text))


def short_label(type_short: str, name: str) -> str:
    # City names are customarily shown without a prefix; other locality types
    # need their abbreviation to avoid ambiguity.
    return name if type_short in {"г", "г."} else f"{type_short} {name}"


def build(url: str, output: Path, snapshot_date: str, regions: set[str] | None = None) -> int:
    truststore.inject_into_ssl()
    remote = RemoteZipFile(url)
    with zipfile.ZipFile(io.BufferedReader(remote, buffer_size=1024 * 1024)) as archive:
        infos = archive.infolist()

    types_member = next((info for info in infos if "AS_ADDR_OBJ_TYPES_" in info.filename.upper()), None)
    object_members = [(ADDR_OBJECT.match(info.filename).group(1), info) for info in infos if ADDR_OBJECT.match(info.filename)]
    hierarchy_members = [(ADM_HIERARCHY.match(info.filename).group(1), info) for info in infos if ADM_HIERARCHY.match(info.filename)]
    if regions:
        object_members = [item for item in object_members if item[0] in regions]
        hierarchy_members = [item for item in hierarchy_members if item[0] in regions]
    if not types_member or not object_members or not hierarchy_members:
        raise RuntimeError("Expected FIAS address object and hierarchy members were not found")

    type_names: dict[tuple[int, str], str] = {}
    def add_type(attributes):
        if attributes.get("ISACTIVE", "").casefold() == "true":
            type_names[(int(attributes["LEVEL"]), attributes["SHORTNAME"])] = attributes["NAME"]
    parse_member(url, types_member, "ADDRESSOBJECTTYPE", add_type)

    objects: dict[int, dict] = {}
    localities: set[int] = set()
    regions_by_code: dict[str, int] = {}

    print(f"Reading {len(object_members)} address-object files...", flush=True)
    for index, (region_code, info) in enumerate(object_members, 1):
        def add_object(attributes):
            if attributes.get("ISACTUAL") != "1" or attributes.get("ISACTIVE") != "1":
                return
            level = int(attributes["LEVEL"])
            type_short = attributes["TYPENAME"]
            object_id = int(attributes["OBJECTID"])
            if level <= 6:
                objects[object_id] = {
                    "id": attributes["OBJECTGUID"],
                    "object_id": object_id,
                    "name": attributes["NAME"],
                    "type_name": type_names.get((level, type_short), type_short),
                    "type_short": type_short,
                    "level": level,
                    "region_code": region_code,
                }
            is_city_above_locality_level = level in {1, 2} and type_short.rstrip(".").casefold() == "г"
            if (level in LOCALITY_LEVELS and type_short != "с/с") or is_city_above_locality_level:
                localities.add(object_id)
            if level == 1:
                regions_by_code.setdefault(region_code, object_id)

        parse_member(url, info, "OBJECT", add_object)
        print(f"  objects {index}/{len(object_members)}: {info.filename}", flush=True)

    paths: dict[int, list[int]] = {}
    print(f"Reading {len(hierarchy_members)} administrative-hierarchy files...", flush=True)
    for index, (_, info) in enumerate(hierarchy_members, 1):
        def add_path(attributes):
            if attributes.get("ISACTIVE") != "1":
                return
            object_id = int(attributes["OBJECTID"])
            if object_id in localities:
                paths[object_id] = [int(item) for item in attributes["PATH"].split(".")]

        parse_member(url, info, "ITEM", add_path)
        print(f"  hierarchy {index}/{len(hierarchy_members)}: {info.filename}", flush=True)

    output.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for object_id in sorted(localities):
        item = objects.get(object_id)
        if not item:
            continue
        region_id = regions_by_code.get(item["region_code"])
        region = objects.get(region_id) if region_id else None
        if not region:
            continue
        parent_names = []
        for parent_id in paths.get(object_id, []):
            parent = objects.get(parent_id)
            if not parent or parent_id in {object_id, region_id} or parent["level"] not in PARENT_LEVELS:
                continue
            label = short_label(parent["type_short"], parent["name"])
            if label not in parent_names:
                parent_names.append(label)
        district = " · ".join(parent_names[-2:]) or None
        label = short_label(item["type_short"], item["name"])
        # Federal cities are both a locality and their own region; avoid
        # labels such as "Москва, Москва" while keeping region_name useful.
        region_label = region["name"] if region["name"].casefold() != item["name"].casefold() else None
        full = ", ".join(part for part in (label, region_label, district) if part)
        rows.append({
            "id": str(UUID(item["id"])),
            "object_id": object_id,
            "name": item["name"],
            "type_name": item["type_name"],
            "type_short": item["type_short"],
            "region_name": region["name"],
            "district_name": district,
            "short_label": label,
            "full_label": full,
            "search_name": normalized(item["name"], item["type_short"], region["name"], district),
        })

    # Administrative data occasionally contains genuinely indistinguishable
    # display paths. Keep the common case concise and add a stable FIAS code
    # only to the colliding labels so every picker option remains unambiguous.
    label_counts = Counter(row["full_label"] for row in rows)
    for row in rows:
        if label_counts[row["full_label"]] > 1:
            row["full_label"] += f" · ФИАС {row['object_id']}"

    rows.sort(key=lambda row: (row["search_name"], row["region_name"], row["id"]))
    with output.open("wb") as binary:
        with gzip.GzipFile(filename="", mode="wb", fileobj=binary, mtime=0, compresslevel=9) as compressed:
            with io.TextIOWrapper(compressed, encoding="utf-8") as stream:
                stream.write(json.dumps({"meta": {
                    "source": "GAR/FIAS, Federal Tax Service of Russia",
                    "sourceUrl": url,
                    "snapshotDate": snapshot_date,
                    "records": len(rows),
                }}, ensure_ascii=False, separators=(",", ":")) + "\n")
                for row in rows:
                    stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--snapshot-date", default=SNAPSHOT_DATE)
    parser.add_argument("--regions", nargs="*", help="optional two-digit region codes for a development sample")
    args = parser.parse_args()
    try:
        count = build(args.url, args.output, args.snapshot_date, set(args.regions) if args.regions else None)
    except KeyboardInterrupt:
        raise SystemExit(130) from None
    print(f"Wrote {count} active localities to {args.output}")


if __name__ == "__main__":
    main()
