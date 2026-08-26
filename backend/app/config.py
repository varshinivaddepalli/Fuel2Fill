from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Database
    database_url: str = ""

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"  # For Ask Astra (SQL generation)
    click_astra_model: str = "llama-3.3-70b-versatile"  # For Click Astra (OCR extraction)

    # Mistral (for OCR)
    mistral_api_key: str = ""

    # LangSmith: LANGSMITH_API_KEY and LANGSMITH_TRACING are read
    # directly from environment variables by the langsmith SDK.
    # See render.yaml for production config.

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Query limits
    query_timeout_seconds: int = 30
    max_result_rows: int = 1000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
