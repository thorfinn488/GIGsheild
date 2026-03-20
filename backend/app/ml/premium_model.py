from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PremiumResult:
    weekly_premium: int
    weekly_coverage: int
    tier: str


PLATFORM_FACTORS = {
    "Zomato": 1.0,
    "Swiggy": 1.0,
    "Amazon": 0.92,
    "Blinkit": 0.88,
    "Zepto": 0.85,
    "Flipkart": 0.9,
}


def tier_from_earnings(weekly_earnings: int) -> str:
    if weekly_earnings < 3000:
        return "Starter"
    if weekly_earnings < 5500:
        return "Standard"
    return "Pro"


def coverage_for_tier(tier: str) -> int:
    return {"Starter": 2000, "Standard": 4200, "Pro": 7000}.get(tier, 4200)


def premium_calc(
    *,
    zone_risk_score: int,
    weekly_earnings: int,
    platform: str,
    weekly_claim_rate: float = 0.02,
) -> PremiumResult:
    """
    Mock RandomForest-like regressor: deterministic mapping with clamping.
    """
    base = round(weekly_earnings * 0.0185)  # ~1.85% of weekly earnings

    # Zone risk multiplier: 0.8 (low) -> 1.4 (high).
    zone_multiplier = 0.8 + (zone_risk_score / 100) * 0.6

    platform_factor = PLATFORM_FACTORS.get(platform, 1.0)

    # A small "claims history" effect (mock): higher claim rate -> slightly higher premium.
    history_multiplier = 1.0 + min(0.2, weekly_claim_rate * 2.0)

    raw = base * zone_multiplier * platform_factor * history_multiplier
    premium = max(49, min(149, int(round(raw))))

    tier = tier_from_earnings(weekly_earnings)
    coverage = coverage_for_tier(tier)
    return PremiumResult(weekly_premium=premium, weekly_coverage=coverage, tier=tier)

