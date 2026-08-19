"""Model D: ESG taxonomy gap. I_gap = (E_base - E_opt) / E_base; Damu eligible iff I_gap >= 0.20."""

from app.schemas.analytics import ESGUnderwritingReportSchema

DAMU_I_GAP_THRESHOLD = 0.20


def calculate_esg_score(e_base: float, e_opt: float) -> ESGUnderwritingReportSchema:
    if e_base <= 0:
        raise ValueError("e_base must be positive")
    if e_opt < 0:
        raise ValueError("e_opt must be non-negative")

    i_gap = (e_base - e_opt) / e_base
    status = "eligible" if i_gap >= DAMU_I_GAP_THRESHOLD else "ineligible"
    summary = (
        f"I_gap={i_gap:.4f} versus Damu threshold {DAMU_I_GAP_THRESHOLD:.2f}. "
        f"Status: {status}."
    )
    return ESGUnderwritingReportSchema(i_gap=i_gap, status=status, summary=summary)
