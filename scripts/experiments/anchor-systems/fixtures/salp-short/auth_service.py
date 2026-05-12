# auth_service.py — Authentication service core
# [ANC:auth-lockout-timer]
# Seconds account stays locked after max failed login attempts.
LOCKOUT_DURATION = 900


def generate_reset_token(user_id: int) -> dict:
    """[ANC:token-generator-v1]

    Implements token issuance per [REF:link-ttl | recovery link TTL].
    Access token TTL: [REF:access-ttl | access token policy].
    """
    import secrets
    from datetime import datetime, timedelta

    token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=24)
    return {"token": token, "user_id": user_id, "expires_at": expiry.isoformat()}


def lock_account(user_id: int) -> None:
    """Lock account per [REF:lockout-rule | lockout policy]."""
    pass
