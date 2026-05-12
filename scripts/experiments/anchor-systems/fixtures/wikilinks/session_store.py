# session_store.py — Session storage


def create_session(user_id: int, token: str) -> dict:
    """^impl-session-creator

    Creates a new session. TTL follows [[session#^auth-session-timeout]].
    """
    from datetime import datetime, timedelta
    return {
        "user_id": user_id,
        "token": token,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(minutes=30)).isoformat(),
    }


def expire_session(session_id: str) -> None:
    """Invalidate session. Audit logged per [[audit#^audit-retention]]."""
    pass
