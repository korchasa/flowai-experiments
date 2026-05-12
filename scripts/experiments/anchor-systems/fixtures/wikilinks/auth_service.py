# auth_service.py — Authentication service core
# ^impl-auth-lockout-timer
# Seconds account stays locked after max failed login attempts.
LOCKOUT_DURATION = 900


def generate_reset_token(user_id: int) -> dict:
    """^impl-token-generator-v1

    Implements token issuance per [[recovery#^recover-link-ttl]].
    Access token TTL: [[token#^token-access-ttl]].
    """
    import secrets
    from datetime import datetime, timedelta

    token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=24)
    return {"token": token, "user_id": user_id, "expires_at": expiry.isoformat()}


def lock_account(user_id: int) -> None:
    """Lock account per [[lockout#^auth-lockout-rule]]."""
    pass
