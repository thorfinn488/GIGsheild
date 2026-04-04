"""Mobile OTP generation and normalization."""

from __future__ import annotations

import os
import secrets


def normalize_mobile(mobile: str) -> str:
    """Strip whitespace; use as canonical key for storage and verify."""
    return "".join(mobile.split())


def otp_length() -> int:
    raw = os.environ.get("OTP_LENGTH", "4")
    try:
        n = int(raw)
    except ValueError:
        return 4
    return max(4, min(8, n))


def generate_numeric_otp() -> str:
    """Cryptographically secure numeric OTP (length from OTP_LENGTH, default 4)."""
    length = otp_length()
    upper = 10**length
    return f"{secrets.randbelow(upper):0{length}d}"
