# Token Revocation

Token revocation is available via the `POST /auth/revoke` endpoint. Both access tokens and refresh tokens can be revoked explicitly by the token holder or by an administrator.

Revocation is propagated to all resource servers within 30 seconds via a shared revocation list. Resource servers must check the revocation list on every request for sensitive operations rather than relying solely on the token `exp` claim.

Revoking an access token does not automatically revoke the associated refresh token, and vice versa. To fully terminate a session, both tokens must be revoked. For access token lifetime details see [token.md:Access Token Lifetime]. For refresh token lifetime and rotation see [refresh.md:Refresh Token Lifetime].
