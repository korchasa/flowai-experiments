# auth_service.py — Authentication service core
# [ANC:impl:auth-lockout-timer]
# Seconds account stays locked after max failed login attempts.
LOCKOUT_DURATION = 900


def generate_reset_token(user_id: int) -> dict:
    """[ANC:impl:token-generator-v1]

    Implements token issuance per [REF:recover:link-ttl | recovery link TTL].
    Access token TTL: [REF:token:access-ttl | access token policy].
    """
    import secrets
    from datetime import datetime, timedelta

    token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=24)
    return {"token": token, "user_id": user_id, "expires_at": expiry.isoformat()}


def lock_account(user_id: int) -> None:
    """Lock account per [REF:auth:lockout-rule | lockout policy]."""
    pass
