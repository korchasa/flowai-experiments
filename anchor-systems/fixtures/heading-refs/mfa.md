# Multi-Factor Authentication

## SMS OTP Rules

SMS OTP codes are 6 digits, valid for 90 seconds, delivered via the SMS gateway. Each code is single-use.

Codes are invalidated immediately after first verification attempt, whether successful or not. The gateway enforces delivery rate limits independently of the application layer.

## TOTP Time Window

TOTP codes are accepted within ±30 seconds of the current 30-second window to account for clock skew.

The TOTP algorithm follows RFC 6238 with SHA-1 and a 30-second step. Clients should display a countdown timer. OTP delivery is rate-limited as defined in [ratelimit.md:OTP Rate Window]. Session-level OTP validity is described in [session.md:Session OTP TTL].
