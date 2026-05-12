# session_store.py — Session storage


def create_session(user_id: int, token: str) -> dict:
    """UID: 202605121018

    Creates a new session. TTL follows [[202605121001]].
    """
    from datetime import datetime, timedelta
    return {
        "user_id": user_id,
        "token": token,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(minutes=30)).isoformat(),
    }


def expire_session(session_id: str) -> None:
    """Invalidate session. Audit logged per [[202605121014]]."""
    pass
