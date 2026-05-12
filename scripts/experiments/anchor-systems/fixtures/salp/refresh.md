# Refresh Token Policy

[ANC:token:refresh-ttl]
Refresh tokens are valid for 7 days. They are rotated on each use. Revocation invalidates all dependent access tokens.

Rotation means the server issues a new refresh token on every use and immediately invalidates the presented token. If a revoked refresh token is presented, the server revokes the entire token family and forces re-authentication.

Refresh tokens are bound to the user agent and IP subnet at issuance; significant changes trigger step-up verification. Refresh tokens inherit the session timeout — see [REF:auth:session-timeout | session timeout policy]. The access token lifetime post-refresh follows [REF:token:access-ttl | access token lifetime].
