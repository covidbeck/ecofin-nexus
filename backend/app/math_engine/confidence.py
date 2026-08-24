"""Deterministic confidence bands.

Rule-based half-widths by data quality (documented heuristic, not statistics
inferred by an LLM):

  measured   ±3%
  confirmed  ±5%
  estimated  ±12%
  simulated  adds ±10 percentage points on top of the underlying quality
"""

from dataclasses import dataclass

QUALITY_HALF_WIDTH: dict[str, float] = {
    "measured": 0.03,
    "confirmed": 0.05,
    "estimated": 0.12,
}
SIMULATION_EXTRA = 0.10


@dataclass
class ConfidenceBand:
    low: float
    high: float
    half_width_share: float
    label: str


def confidence_band(
    value: float,
    data_quality: str,
    simulated: bool = False,
) -> ConfidenceBand:
    half = QUALITY_HALF_WIDTH.get(data_quality, QUALITY_HALF_WIDTH["estimated"])
    if simulated:
        half += SIMULATION_EXTRA
    spread = abs(value) * half
    label = f"±{half * 100:.0f}%"
    return ConfidenceBand(
        low=value - spread,
        high=value + spread,
        half_width_share=half,
        label=label,
    )
