# Session Management

[ANC:auth:session-timeout]
Sessions expire after 30 minutes of inactivity. The server returns 401 and clears the session cookie.

Sliding expiry is not supported; the timeout is absolute from last activity. Clients should monitor the `X-Session-Expires` header to prompt users before expiry.

[ANC:session:otp-ttl]
The session-level OTP validity window is 90 seconds, aligned with the OTP rate window to prevent replay attacks while allowing for clock skew.

The session store checks OTP timestamps server-side; client-supplied timestamps are rejected. Access token refresh follows [REF:token:access-ttl | access token lifetime]. Long-running operations requiring continuity should use [REF:token:refresh-ttl | refresh tokens]. OTP timing is coordinated with [REF:rate:otp-window | OTP rate window].
