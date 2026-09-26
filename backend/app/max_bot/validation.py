import hashlib
import hmac
import json
import re
import time
from urllib.parse import parse_qsl

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.errors import AppError


class MaxIdentity(BaseModel):
    model_config = ConfigDict(strict=True)
    id: int = Field(gt=0, le=9223372036854775807)
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    username: str | None = Field(default=None, max_length=255)
    photo_url: str | None = Field(default=None, max_length=2048)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def validate_init_data(raw: str, token: str, max_age: int, now: int | None = None) -> MaxIdentity:
    invalid = AppError("invalid_init_data", "Откройте мини-приложение заново через MAX.", 401)
    try:
        if len(raw) > 16384 or re.search(r"%(?![0-9a-fA-F]{2})", raw):
            raise ValueError()
        pairs = parse_qsl(raw, keep_blank_values=True, strict_parsing=True, errors="strict", max_num_fields=30)
        data = dict(pairs)
        if len(data) != len(pairs):
            raise ValueError()
        signature = data.pop("hash")
        if not re.fullmatch(r"[0-9a-fA-F]{64}", signature):
            raise ValueError()
        check = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
        secret = hmac.digest(b"WebAppData", token.encode(), "sha256")
        expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature.lower()):
            raise ValueError()
        if not re.fullmatch(r"[0-9]+", data["auth_date"]):
            raise ValueError()
        timestamp = int(data["auth_date"])
        age = (int(time.time()) if now is None else now) - timestamp
        if age < -60 or age > max_age:
            raise ValueError()
        return MaxIdentity.model_validate(json.loads(data["user"], object_pairs_hook=unique_object))
    except (ValueError, KeyError, TypeError, UnicodeError, ValidationError):
        raise invalid from None
