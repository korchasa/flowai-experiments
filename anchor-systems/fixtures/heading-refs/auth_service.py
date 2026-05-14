# auth_service.py — Authentication service core
# # LOCKOUT_DURATION
# Seconds account stays locked after max failed login attempts.
LOCKOUT_DURATION = 900


def generate_reset_token(user_id: int) -> dict:
    """# generate_reset_token

    Implements token issuance per [recovery.md:Recovery Link TTL].
    Access token TTL: [token.md:Access Token Lifetime].
    """
    import secrets
    from datetime import datetime, timedelta

    token = secrets.token_urlsafe(32)
    expiry = datetime.now() + timedelta(hours=24)
    return {"token": token, "user_id": user_id, "expires_at": expiry.isoformat()}


def lock_account(user_id: int) -> None:
    """Lock account per [lockout.md:Account Lockout Rule]."""
    pass
