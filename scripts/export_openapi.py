#!/usr/bin/env python3
"""Export deterministic JSON and YAML OpenAPI artifacts without contacting the DB."""
import argparse
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://unused:unused@localhost/unused")

from app.main import create_app  # noqa: E402


def yaml_scalar(value):
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(value, ensure_ascii=False)


def yaml_dump(value, indent=0):
    prefix = " " * indent
    if isinstance(value, dict):
        if not value:
            return "{}"
        lines = []
        for key, child in value.items():
            rendered_key = yaml_scalar(str(key))
            if isinstance(child, (dict, list)) and child:
                lines.append(f"{prefix}{rendered_key}:")
                lines.append(yaml_dump(child, indent + 2))
            else:
                lines.append(f"{prefix}{rendered_key}: {yaml_dump(child, 0)}")
        return "\n".join(lines)
    if isinstance(value, list):
        if not value:
            return "[]"
        lines = []
        for child in value:
            if isinstance(child, (dict, list)) and child:
                lines.append(f"{prefix}-")
                lines.append(yaml_dump(child, indent + 2))
            else:
                lines.append(f"{prefix}- {yaml_dump(child, 0)}")
        return "\n".join(lines)
    return yaml_scalar(value)


def rendered_artifacts():
    schema = create_app().openapi()
    return {
        ROOT / "docs" / "openapi.json": json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
        ROOT / "DATA-API.yaml": yaml_dump(schema) + "\n",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if committed artifacts are stale")
    args = parser.parse_args()
    stale = []
    for path, content in rendered_artifacts().items():
        if args.check:
            if not path.exists() or path.read_text() != content:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.write_text(content)
            print(path.relative_to(ROOT))
    if stale:
        raise SystemExit("Stale OpenAPI artifacts: " + ", ".join(stale))


if __name__ == "__main__":
    main()
