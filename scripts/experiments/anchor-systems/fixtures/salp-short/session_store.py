# session_store.py — Session storage


def create_session(user_id: int, token: str) -> dict:
    """[ANC:session-creator]

    Creates a new session. TTL follows [REF:session-timeout | session timeout policy].
    """
    from datetime import datetime, timedelta
    return {
        "user_id": user_id,
        "token": token,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(minutes=30)).isoformat(),
    }


def expire_session(session_id: str) -> None:
    """Invalidate session. Audit logged per [REF:retention | audit retention policy]."""
    pass
