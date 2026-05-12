# OAuth 2.0 Integration

## OAuth Callback TTL

OAuth2 authorization codes are valid for 5 minutes. Unused codes are revoked automatically.

Authorization codes are single-use and bound to the redirect URI and client ID presented at the authorisation request. Any mismatch results in immediate code revocation and a security event log entry.

After code exchange the resulting access token follows the standard lifetime defined in [access token lifetime](token.md#access-token-lifetime). Clients should exchange codes immediately and not store them.
