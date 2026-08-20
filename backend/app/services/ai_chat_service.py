"""Agent 5: Virtual Consultant (in-app FAQ / support widget).

Uses the light/fast model (gemini-1.5-flash) — never the heavy pro model used
by agents 1-4. Answers are extraction/framing of hardcoded facts only; no
arithmetic. The 5 canned FAQ entries are served straight from cache without
touching the LLM, which both protects the budget and guarantees the demo
never breaks even if Gemini is down.
"""

import logging

from app.core.config import settings
from app.schemas.support import ChatResponseSchema, FaqItemSchema

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = (
    "Ты — Виртуальный консультант Nexus (EcoFin, Казахстан). Отвечай коротко и по делу "
    "на вопросы о продукте: экономия на тарифах, влияние на экологию РК, поддерживаемые "
    "форматы файлов, защита от штрафов КоАП РК, ESG-отчёт для фонда Даму. "
    "Никогда не считай числа сам и не давай точных финансовых прогнозов сверх того, "
    "что указано в предоставленных фактах. Если вопрос не по теме сервиса — вежливо "
    "скажи, что можешь помочь только с вопросами про Nexus."
)

FAQ_ITEMS: list[FaqItemSchema] = [
    FaqItemSchema(
        id="savings",
        question="Сколько я сэкономлю?",
        answer=(
            "В среднем 10-30% от счета за электроэнергию (до 85 000 ₸/мес для МСБ), "
            "по расчёту нашего математического ядра на основе вашей квитанции."
        ),
    ),
    FaqItemSchema(
        id="ecology",
        question="Как сервис помогает экологии РК?",
        answer=(
            "Снижение пиковых нагрузок физически уменьшает сжигание угля на ТЭЦ "
            "(GHG Protocol Scope 2) — мы считаем избежанные выбросы CO2 по коэффициенту "
            "энергосистемы Казахстана."
        ),
    ),
    FaqItemSchema(
        id="formats",
        question="Какие форматы файлов поддерживаются?",
        answer="PDF, DOCX, JPEG, PNG, WEBP (до 10 МБ).",
    ),
    FaqItemSchema(
        id="fines",
        question="Как работает защита от штрафов?",
        answer=(
            "Мы мониторим превышение договорной мощности и перекос фаз по ст. 289 "
            "КоАП РК, чтобы вы могли скорректировать нагрузку до начисления штрафа."
        ),
    ),
    FaqItemSchema(
        id="esg_damu",
        question="Что такое ESG-отчет для Даму?",
        answer=(
            "Автоматическая заявка на зелёные субсидии фонда «Даму» с льготной ставкой "
            "7-8%, формируемая по индексу эффективности I_gap из вашей квитанции."
        ),
    ),
]

FALLBACK_REPLY = (
    "Сейчас не получилось обратиться к ассистенту. Загляните в раздел FAQ — там есть "
    "ответы про экономию, экологию, форматы файлов, штрафы КоАП РК и ESG-отчёт для Даму."
)


class AIChatService:
    def get_faq(self) -> list[FaqItemSchema]:
        return list(FAQ_ITEMS)

    async def chat(self, message: str) -> ChatResponseSchema:
        cached = self._match_faq(message)
        if cached is not None:
            return ChatResponseSchema(reply=cached.answer, source="faq_cache")

        try:
            reply = self._call_flash_model(message)
            return ChatResponseSchema(reply=reply, source="gemini-flash")
        except Exception:
            logger.exception("Chat widget LLM call failed; using fallback reply")
            return ChatResponseSchema(reply=FALLBACK_REPLY, source="fallback")

    @staticmethod
    def _match_faq(message: str) -> FaqItemSchema | None:
        text = message.strip().lower()
        keyword_map = {
            "savings": ("сколько", "сэконом", "savings", "выгод"),
            "ecology": ("эколог", "экологи", "co2", "выброс"),
            "formats": ("формат", "файл", "pdf", "docx", "jpeg", "png"),
            "fines": ("штраф", "коап", "мощност"),
            "esg_damu": ("esg", "даму", "damu", "субсид"),
        }
        for faq_id, keywords in keyword_map.items():
            if any(keyword in text for keyword in keywords):
                return next(item for item in FAQ_ITEMS if item.id == faq_id)
        return None

    def _call_flash_model(self, message: str) -> str:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is missing")

        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            settings.gemini_chat_model or "gemini-1.5-flash",
            system_instruction=CHAT_SYSTEM_PROMPT,
        )
        response = model.generate_content(
            message,
            generation_config={"temperature": 0.3},
        )
        reply = (getattr(response, "text", None) or "").strip()
        if not reply:
            raise ValueError("empty response from flash model")
        return reply
