from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class BotSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", hide_input_in_errors=True)

    max_bot_token: SecretStr = Field(min_length=1)
    max_bot_username: str = Field(default="", pattern=r"^[A-Za-z0-9_]*$")
    max_mini_app_enabled: bool = False
    max_polling_cursor_file: Path = Path(".state/max-marker.json")
