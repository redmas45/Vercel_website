from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./aikart.db"

    # CORS — comma-separated origins for the frontend
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Widget / hub integration
    lab_allowed_script_origins: str = ""
    shopbot_hub_origin: str = ""

    # App
    app_env: str = "development"
    public_https_origin: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_script_origins_set(self) -> set[str]:
        origins: set[str] = set()
        for o in self.lab_allowed_script_origins.split():
            if o.strip():
                origins.add(o.strip())
        if self.shopbot_hub_origin.strip():
            origins.add(self.shopbot_hub_origin.strip().rstrip("/"))
        return origins


settings = Settings()
