"""Application settings from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def _loopback_twin(origin: str) -> str | None:
    if "://localhost" in origin:
        return origin.replace("://localhost", "://127.0.0.1", 1)
    if "://127.0.0.1" in origin:
        return origin.replace("://127.0.0.1", "://localhost", 1)
    return None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    cors_origins: str = "http://localhost:3000"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "payment-screenshots"

    ai_vision_provider: str = ""
    ai_vision_api_key: str = ""
    ai_vision_model: str = ""

    whatsapp_verify_token: str = ""
    whatsapp_app_secret: str = ""
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        # localhost and 127.0.0.1 are different browser origins; allow both.
        origins: list[str] = []
        for origin in (o.strip() for o in self.cors_origins.split(",") if o.strip()):
            for candidate in (origin, _loopback_twin(origin)):
                if candidate and candidate not in origins:
                    origins.append(candidate)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
