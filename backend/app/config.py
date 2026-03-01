from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Legal Simplifier API"
    app_env: str = "development"

    llm_provider: str = Field(default="azure", validation_alias="LLM_PROVIDER")
    azure_openai_api_key: str | None = Field(default=None, validation_alias="AZURE_OPENAI_API_KEY")
    azure_openai_endpoint: str | None = Field(default=None, validation_alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_chat_deployment: str | None = Field(
        default=None, validation_alias="AZURE_OPENAI_CHAT_DEPLOYMENT"
    )
    azure_openai_chat_api_version: str = Field(
        default="2025-01-01-preview", validation_alias="AZURE_OPENAI_CHAT_API_VERSION"
    )

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    cors_allow_origins: str = Field(default="*", validation_alias="CORS_ALLOW_ORIGINS")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
