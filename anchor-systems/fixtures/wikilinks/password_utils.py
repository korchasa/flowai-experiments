# password_utils.py — Password validation utilities


def check_strength(password: str) -> bool:
    """^sec-password-strength

    A strong password has: ≥12 chars, ≥1 digit, ≥1 uppercase, ≥1 special char.
    Rule: [[password#^auth-password-policy]].
    """
    return (
        len(password) >= 12
        and any(c.isdigit() for c in password)
        and any(c.isupper() for c in password)
        and any(not c.isalnum() for c in password)
    )


def check_history(password: str, history: list) -> bool:
    """Check that password was not used in the last 10 cycles."""
    import hashlib
    ph = hashlib.sha256(password.encode()).hexdigest()
    return ph not in history[-10:]


def check_complexity(password: str) -> dict:
    """Analyse password complexity score (0–100). Internal use only."""
    score = sum([
        20 if len(password) >= 12 else (10 if len(password) >= 8 else 0),
        20 if any(c.isdigit() for c in password) else 0,
        20 if any(c.isupper() for c in password) else 0,
        20 if any(not c.isalnum() for c in password) else 0,
        20 if len(password) >= 16 else 0,
    ])
    return {"score": score}


def check_format(password: str) -> bool:
    """Ensure password contains only ASCII printable characters."""
    return all(32 <= ord(c) <= 126 for c in password)
