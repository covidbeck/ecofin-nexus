import os


class Settings:
    @property
    def gemini_api_key(self) -> str:
        return os.getenv("GEMINI_API_KEY", "")

    @property
    def gemini_model(self) -> str:
        """Heavy model for agents 1-4 (extraction, OCR, roadmap, ESG framing)."""
        return os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

    @property
    def gemini_chat_model(self) -> str:
        """Light/fast model for agent 5 (support widget FAQ/chat)."""
        return os.getenv("GEMINI_CHAT_MODEL", "gemini-1.5-flash")


settings = Settings()
