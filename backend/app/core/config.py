import os


class Settings:
    @property
    def database_url(self) -> str:
        return os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://ecofin:ecofin@db:5432/ecofin",
        )

    @property
    def gemini_api_key(self) -> str:
        return os.getenv("GEMINI_API_KEY", "")

    @property
    def gemini_model(self) -> str:
        """Model for the bill-extraction adapter (fields only, no math)."""
        return os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

    @property
    def gemini_chat_model(self) -> str:
        """Light model for the Copilot widget (explanations/FAQ only)."""
        return os.getenv("GEMINI_CHAT_MODEL", "gemini-1.5-flash")

    @property
    def session_ttl_hours(self) -> int:
        return int(os.getenv("SESSION_TTL_HOURS", "72"))


settings = Settings()
