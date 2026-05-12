# Token Lifecycle

[ANC:token:access-ttl]
Access tokens are valid for 15 minutes from issuance. Clients must use the refresh flow after expiry.

Tokens are signed JWTs. The `exp` claim is the authoritative expiry; clients must not cache tokens beyond this value. Clock skew tolerance is 30 seconds.

When a token expires the client should obtain a new access token using the refresh token, without requiring the user to re-authenticate. Session inactivity rules are separate from token expiry — see [REF:auth:session-timeout | session timeout policy]. For the refresh token lifecycle see [REF:token:refresh-ttl | refresh token lifetime].
