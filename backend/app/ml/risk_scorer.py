from __future__ import annotations

import datetime as dt
import random


ZONE_BASE_RISK = {
    "Mumbai — Andheri West": 68,
    "Delhi — Connaught Place": 62,
    "Bengaluru — Koramangala": 55,
    "Chennai — T. Nagar": 58,
    "Hyderabad — Hitec City": 52,
}


def compute_zone_risk_score(zone: str, weekly_earnings: int) -> int:
    """
    Mock zone risk scorer (0-100) using deterministic-ish heuristics.
    """
    base = ZONE_BASE_RISK.get(zone, 50)

    # Seasonal multiplier: monsoon-ish months tend to increase disruption risk.
    month = dt.datetime.utcnow().month
    season_multiplier = 1.15 if month in (6, 7, 8, 9) else 1.05 if month in (11, 12, 1) else 1.0

    earnings_factor = min(1.25, 1 + (weekly_earnings - 3000) / 20000)

    # Add a small stable jitter based on string hash (so it feels "ML-like").
    jitter = (abs(hash(zone)) % 7 - 3) * 0.8

    score = base * season_multiplier * earnings_factor + jitter
    return max(0, min(100, int(round(score))))


def risk_breakdown_from_score(zone: str, risk_score: int) -> dict[str, int]:
    """
    Convert a risk score into mock breakdown features for the UI/README.
    """
    # Approximate linear mapping to "days/year" style signals.
    flood_days = int(round(3 + (risk_score / 100) * 14))  # ~3..17
    aqi_spikes = int(round(1 + (risk_score / 100) * 10))  # ~1..11
    strike_freq = int(round(1 + (risk_score / 100) * 6))  # ~1..7

    # A small correction for flood-prone zones (mock).
    if "Andheri" in zone:
        flood_days = min(19, flood_days + 3)

    return {
        "floodDaysPerYear": flood_days,
        "aqiSpikeDaysPerYear": aqi_spikes,
        "strikeFrequency": strike_freq,
    }

