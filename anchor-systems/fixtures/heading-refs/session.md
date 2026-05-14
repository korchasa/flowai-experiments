# Session Management

## Session Timeout Policy

Sessions expire after 30 minutes of inactivity. The server returns 401 and clears the session cookie.

Sliding expiry is not supported; the timeout is absolute from last activity. Clients should monitor the `X-Session-Expires` header to prompt users before expiry.

## Session OTP TTL

The session-level OTP validity window is 90 seconds, aligned with the OTP rate window to prevent replay attacks while allowing for clock skew.

The session store checks OTP timestamps server-side; client-supplied timestamps are rejected. Access token refresh follows [token.md:Access Token Lifetime]. Long-running operations requiring continuity should use [refresh.md:Refresh Token Lifetime]. OTP timing is coordinated with [ratelimit.md:OTP Rate Window].
