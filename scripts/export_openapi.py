#!/usr/bin/env python3
"""Export the deterministic OpenAPI artifact without contacting the DB.

DATA-API.yaml is a separate API Judge 1.0 scenario and must not be generated
from the OpenAPI document.
"""
import argparse
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://unused:unused@localhost/unused")

from app.main import create_app  # noqa: E402


def rendered_artifacts():
    schema = create_app().openapi()
    return {
        ROOT / "docs" / "openapi.json": json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
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
