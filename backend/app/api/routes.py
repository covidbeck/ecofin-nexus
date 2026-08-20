from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.dependencies import verify_token
from app.schemas.analytics import BillAnalysisResponseSchema, HealthResponseSchema
from app.schemas.billing import (
    CaptchaRequestSchema,
    CaptchaResponseSchema,
    SubscribeRequestSchema,
    SubscribeResponseSchema,
)
from app.schemas.support import ChatRequestSchema, ChatResponseSchema, FaqListResponseSchema
from app.services.ai_agents import AIAgentsService
from app.services.ai_chat_service import AIChatService
from app.services.ai_extractor import AIExtractorService
from app.services.bill_analyzer import analyze_utility_bill

router = APIRouter()
extractor = AIExtractorService()
agents = AIAgentsService()
chat_service = AIChatService()

TIER_LABELS = {
    "free": "Freemium",
    "pro_7500": "Nexus Pro",
    "enterprise_50000": "ESG Bridge",
}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
    "image/webp",
}
MIME_ALIASES = {
    "image/jpg": "image/jpeg",
}
EXT_TO_MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def resolve_content_type(upload: UploadFile) -> str:
    raw = MIME_ALIASES.get((upload.content_type or "").lower(), (upload.content_type or "").lower())
    if raw in ALLOWED_TYPES:
        return raw
    name = (upload.filename or "").lower()
    for ext, mime in EXT_TO_MIME.items():
        if name.endswith(ext):
            return mime
    return raw


@router.get("/api/v1/health", response_model=HealthResponseSchema)
async def health() -> HealthResponseSchema:
    return HealthResponseSchema(status="ok", message="EcoFin Nexus API is running")


@router.post("/api/v1/analyze-bill", response_model=BillAnalysisResponseSchema)
async def analyze_bill(file: UploadFile = File(...)) -> BillAnalysisResponseSchema:
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    content_type = resolve_content_type(file)
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported media type. Use PDF, DOCX, PNG, JPEG, or WebP.",
        )

    bill = await extractor.extract_bill_data(payload, content_type)
    analysis = analyze_utility_bill(bill)
    math_data = {
        "shifted_kwh": analysis.arbitrage.shifted_kwh,
        "delta_cost_kzt": analysis.arbitrage.delta_cost_kzt,
        "i_gap": analysis.esg.i_gap,
        "esg_status": analysis.esg.status,
        "co2_avoided_tonnes": analysis.scope2.co2_avoided_tonnes,
        "trees_equivalent": analysis.scope2.trees_equivalent,
    }
    return analysis.model_copy(
        update={
            "ai_roadmap": agents.generate_roadmap(math_data),
            "esg_executive_summary": agents.generate_esg_summary(math_data),
        }
    )


@router.get("/api/v1/faq", response_model=FaqListResponseSchema)
async def get_faq() -> FaqListResponseSchema:
    return FaqListResponseSchema(items=chat_service.get_faq())


@router.post("/api/v1/chat", response_model=ChatResponseSchema)
async def chat(payload: ChatRequestSchema) -> ChatResponseSchema:
    return await chat_service.chat(payload.message)


@router.post("/api/v1/verify-captcha", response_model=CaptchaResponseSchema)
async def verify_captcha(_payload: CaptchaRequestSchema) -> CaptchaResponseSchema:
    # Mock validator: always succeeds so the frontend "I'm not a robot" checkbox
    # can be wired up before a real captcha provider is chosen.
    return CaptchaResponseSchema(status="success", score=0.9)


@router.post("/api/v1/subscribe", response_model=SubscribeResponseSchema)
async def subscribe(payload: SubscribeRequestSchema) -> SubscribeResponseSchema:
    # Mock billing: no real payment provider wired up yet (MVP scope).
    return SubscribeResponseSchema(
        status="success",
        payment_url=f"mock_redirect_to_kaspi_or_stripe?tier={payload.tier_id}&cycle={payload.billing_cycle}",
        tier=TIER_LABELS.get(payload.tier_id, payload.tier_id),
    )


@router.get("/api/v1/profile/me")
async def profile_me(user: dict = Depends(verify_token)) -> dict:
    # Demonstrates a protected route behind the mock JWT dependency.
    return {"authenticated": True, "user": user}
