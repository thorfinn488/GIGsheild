from __future__ import annotations

import math


def fraud_probability(
    *,
    gps_active_during_event: bool,
    zone_match: bool,
    account_age_days: int,
    claims_in_30_days: int,
    distance_from_claimed_zone_km: float,
) -> float:
    """
    Mock GradientBoostingClassifier: returns probability in [0,1].
    Rule-based, but shaped like an ML model (sigmoid on weighted features).
    """
    # Feature weights (mock).
    w_gps = -2.2 if gps_active_during_event else 2.8
    w_zone = -1.8 if zone_match else 2.4
    w_age = 1.2 if account_age_days < 14 else -0.4
    w_claims = 0.35 * min(6, claims_in_30_days)
    w_distance = 0.12 * min(50.0, distance_from_claimed_zone_km)

    score = w_gps + w_zone + w_age + w_claims + w_distance

    # Sigmoid to map to probability.
    prob = 1.0 / (1.0 + math.exp(-0.75 * score))
    return max(0.0, min(1.0, prob))


def is_fraud(prob: float, threshold: float = 0.35) -> bool:
    return prob >= threshold

