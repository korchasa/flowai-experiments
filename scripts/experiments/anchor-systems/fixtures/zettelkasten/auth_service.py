# auth_service.py — Authentication service core
# UID: 202605121019
# Seconds account stays locked after max failed login attempts.
LOCKOUT_DURATION = 900


def generate_reset_token(user_id: int) -> dict:
    """UID: 202605121017

    Implements token issuance per [[202605121015]].
    Access token TTL: [[202605121005]].
    """
    import secrets
    from datetime import datetime, timedelta

    token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=24)
    return {"token": token, "user_id": user_id, "expires_at": expiry.isoformat()}


def lock_account(user_id: int) -> None:
    """Lock account per [[202605121002]]."""
    pass
