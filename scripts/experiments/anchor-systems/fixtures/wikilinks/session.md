# Session Management

Sessions expire after 30 minutes of inactivity. The server returns 401 and clears the session cookie. ^auth-session-timeout

Sliding expiry is not supported; the timeout is absolute from last activity. Clients should monitor the `X-Session-Expires` header to prompt users before expiry.

The session-level OTP validity window is 90 seconds, aligned with the OTP rate window to prevent replay attacks while allowing for clock skew. ^session-otp-ttl

The session store checks OTP timestamps server-side; client-supplied timestamps are rejected. Access token refresh follows [[token#^token-access-ttl]]. Long-running operations requiring continuity should use [[refresh#^token-refresh-ttl]]. OTP timing is coordinated with [[ratelimit#^rate-otp-window]].
