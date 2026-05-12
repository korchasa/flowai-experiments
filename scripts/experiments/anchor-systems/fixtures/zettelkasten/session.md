# Session Management

**UID: 202605121001**
Sessions expire after 30 minutes of inactivity. The server returns 401 and clears the session cookie.

Sliding expiry is not supported; the timeout is absolute from last activity. Clients should monitor the `X-Session-Expires` header to prompt users before expiry.

**UID: 202605121016**
The session-level OTP validity window is 90 seconds, aligned with the OTP rate window to prevent replay attacks while allowing for clock skew.

The session store checks OTP timestamps server-side; client-supplied timestamps are rejected. Access token refresh follows [[202605121005]]. Long-running operations requiring continuity should use [[202605121006]]. OTP timing is coordinated with [[202605121009]].
