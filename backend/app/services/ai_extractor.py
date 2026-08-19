from app.schemas.utility_bill import BusinessType, RegionCode, UtilityBillInputSchema

MOCK_BILL = UtilityBillInputSchema(
    total_kwh=3000.0,
    cost_kzt=45000.0,
    business_type=BusinessType.bakery,
    region=RegionCode.astana,
    days_in_month=30,
)


class AIExtractorService:
    """PDF/image extraction. Mocked until Gemini is wired; output is always Pydantic-validated."""

    async def extract_bill_data(self, file: bytes) -> UtilityBillInputSchema:
        del file
        return MOCK_BILL.model_copy()
