from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.analytics import BillAnalysisResponseSchema, HealthResponseSchema
from app.services.ai_agents import AIAgentsService
from app.services.ai_extractor import AIExtractorService
from app.services.bill_analyzer import analyze_utility_bill

router = APIRouter()
extractor = AIExtractorService()
agents = AIAgentsService()

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}


@router.get("/api/v1/health", response_model=HealthResponseSchema)
async def health() -> HealthResponseSchema:
    return HealthResponseSchema(status="ok", message="EcoFin Nexus API is running")


@router.post("/api/v1/analyze-bill", response_model=BillAnalysisResponseSchema)
async def analyze_bill(file: UploadFile = File(...)) -> BillAnalysisResponseSchema:
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Upload a PDF or image utility bill")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file")

    bill = await extractor.extract_bill_data(payload)
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
