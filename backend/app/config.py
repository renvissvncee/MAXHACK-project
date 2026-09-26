from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", hide_input_in_errors=True)

    database_url: SecretStr
    database_timeout_seconds: float = Field(default=3, gt=0, le=30)

    max_bot_token: SecretStr | None = None
    init_data_max_age_seconds: int = Field(default=3600, ge=60, le=86400)
    session_ttl_seconds: int = Field(default=86400, ge=60, le=604800)
    cookie_secure: bool = True
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:8000"]
