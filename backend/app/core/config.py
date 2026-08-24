import os


def _flag(name: str, default: str = "") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    @property
    def database_url(self) -> str:
        return os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://ecofin:ecofin@db:5432/ecofin",
        )

    @property
    def demo_mode(self) -> bool:
        return _flag("DEMO_MODE")

    @property
    def demo_password(self) -> str:
        """Plain password used only to hash the demo user at creation time.

        Never logged. Not required for POST /auth/demo-login once the user exists.
        """
        return os.getenv("DEMO_PASSWORD", "")

    @property
    def demo_email(self) -> str:
        return os.getenv("DEMO_EMAIL", "jury@nexus.demo").strip().lower()

    @property
    def cors_origins(self) -> list[str]:
        raw = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
        return [item.strip() for item in raw.split(",") if item.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        value = os.getenv(
            "CORS_ORIGIN_REGEX",
            r"^http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$",
        ).strip()
        return value or None

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
