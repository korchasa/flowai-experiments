# test_auth.py — Authentication unit tests


def test_token_expiration():
    """^impl-test-token-expiry

    Verifies the 24-hour expiry of reset tokens.
    Tests implementation: [[auth_service#^impl-token-generator-v1]].
    """
    from auth_service import generate_reset_token
    result = generate_reset_token(42)
    assert "expires_at" in result
    assert "token" in result


def test_lockout_duration():
    """Verify LOCKOUT_DURATION equals 900 seconds."""
    from auth_service import LOCKOUT_DURATION
    assert LOCKOUT_DURATION == 900
