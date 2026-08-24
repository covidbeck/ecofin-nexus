"""Copilot: organization-scoped Q&A. Read-only — it never changes data and
never computes numbers; it explains confirmed deterministic results and
answers product FAQs. Deterministic fallback on any LLM failure."""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import ConsumptionRecord, Organization
from app.schemas.copilot import CopilotResponseSchema, FaqItemSchema

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = (
    "Ты — Copilot продукта Nexus (Resource Decision Engine для МСБ). "
    "Ты объясняешь уже подтверждённые детерминированные расчёты и отвечаешь на "
    "вопросы о продукте: цифровой двойник потребления, сценарии, ограничения, "
    "аномалии, качество данных. Никогда не считай числа сам, не давай финансовых "
    "прогнозов и гарантий экономии, не обещай одобрение финансирования. Если данных "
    "нет — честно скажи, что показатель недоступен и что нужно добавить. Если вопрос "
    "не по теме сервиса — вежливо скажи, что можешь помочь только с Nexus."
)

FAQ_ITEMS: list[FaqItemSchema] = [
    FaqItemSchema(
        id="what_is_twin",
        question="Что такое цифровой двойник периода?",
        answer=(
            "Это проверенная модель вашего периода потребления: kWh, стоимость, "
            "эффективная ставка, качество данных, аномалии и допущения. Все числа "
            "рассчитываются детерминированным движком и сопровождаются статусом "
            "(измерено / подтверждено / оценка / симуляция / недоступно)."
        ),
    ),
    FaqItemSchema(
        id="how_scenarios",
        question="Как работают сценарии и оптимизация?",
        answer=(
            "Вы выбираете действия из каталога (коэффициенты — версионируемые оценки "
            "с указанным источником), а движок перебирает допустимые комбинации с "
            "учётом ваших ограничений: CapEx, выпуск, сдвиг графика, гибкая нагрузка. "
            "Результат — симуляция, не гарантия."
        ),
    ),
    FaqItemSchema(
        id="co2_unavailable",
        question="Почему CO₂e показан как недоступный?",
        answer=(
            "CO₂e рассчитывается только при утверждённом коэффициенте выбросов с "
            "источником и сроком действия. Без него Nexus не подставляет правдоподобную "
            "цифру — добавьте коэффициент в настройках организации."
        ),
    ),
    FaqItemSchema(
        id="formats",
        question="Какие форматы файлов поддерживаются?",
        answer="PDF, DOCX, JPEG, PNG, WebP (до 10 МБ). Извлечённые поля вы подтверждаете вручную.",
    ),
    FaqItemSchema(
        id="data_safety",
        question="Кто видит мои данные?",
        answer=(
            "Данные изолированы по организации и доступны только после входа. "
            "Copilot отвечает только по данным вашей организации и не изменяет их."
        ),
    ),
]

FALLBACK_REPLY = (
    "Сейчас не получилось обратиться к ассистенту. Загляните в FAQ — там есть ответы "
    "про цифровой двойник, сценарии, статусы данных и форматы файлов."
)


class CopilotService:
    def get_faq(self) -> list[FaqItemSchema]:
        return list(FAQ_ITEMS)

    async def chat(
        self,
        message: str,
        db: Session,
        organization: Organization,
    ) -> CopilotResponseSchema:
        cached = self._match_faq(message)
        if cached is not None:
            return CopilotResponseSchema(reply=cached.answer, source="faq_cache")

        try:
            context = self._org_context(db, organization)
            reply = self._call_llm(message, context)
            return CopilotResponseSchema(reply=reply, source="llm")
        except Exception:
            logger.exception("Copilot LLM call failed; using deterministic fallback")
            return CopilotResponseSchema(reply=FALLBACK_REPLY, source="fallback")

    @staticmethod
    def _match_faq(message: str) -> FaqItemSchema | None:
        text = message.strip().lower()
        keyword_map = {
            "what_is_twin": ("двойник", "twin", "дашборд", "показатели"),
            "how_scenarios": ("сценар", "оптимиз", "действи", "рекоменд"),
            "co2_unavailable": ("co2", "co₂", "выброс", "углерод", "недоступ"),
            "formats": ("формат", "файл", "pdf", "docx", "png", "webp"),
            "data_safety": ("безопас", "данные", "приватн", "доступ"),
        }
        for faq_id, keywords in keyword_map.items():
            if any(keyword in text for keyword in keywords):
                return next(item for item in FAQ_ITEMS if item.id == faq_id)
        return None

    @staticmethod
    def _org_context(db: Session, organization: Organization) -> str:
        latest = db.scalar(
            select(ConsumptionRecord)
            .where(
                ConsumptionRecord.organization_id == organization.id,
                ConsumptionRecord.status == "confirmed",
            )
            .order_by(ConsumptionRecord.period_start.desc())
        )
        parts = [
            f"Организация: {organization.name}",
            f"Профиль: {organization.business_profile or 'не задан'}",
        ]
        if latest is not None:
            parts.append(
                "Последний подтверждённый период "
                f"{latest.period_start}—{latest.period_end}: {latest.kwh} кВт·ч, "
                f"{latest.cost_kzt} ₸ (качество данных: {latest.data_quality}). "
                "Эти числа уже рассчитаны движком — не пересчитывай их."
            )
        else:
            parts.append("Подтверждённых периодов ещё нет.")
        return "\n".join(parts)

    def _call_llm(self, message: str, context: str) -> str:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is missing")

        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            settings.gemini_chat_model or "gemini-1.5-flash",
            system_instruction=CHAT_SYSTEM_PROMPT,
        )
        response = model.generate_content(
            f"Контекст организации (read-only):\n{context}\n\nВопрос пользователя: {message}",
            generation_config={"temperature": 0.3},
        )
        reply = (getattr(response, "text", None) or "").strip()
        if not reply:
            raise ValueError("empty response from chat model")
        return reply
