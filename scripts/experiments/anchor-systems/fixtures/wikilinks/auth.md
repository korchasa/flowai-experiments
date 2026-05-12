# Authentication Requirements

All user accounts require multi-factor authentication. MFA is verified on every new session and after session expiry. ^auth-mfa-required

Administrators may not disable MFA for any account class. Enforcement is applied at the session creation boundary: a session token is not issued until the second factor is verified.

Session lifetime is controlled by [[session#^auth-session-timeout]]. After a session expires, the client receives a 401 response and must re-authenticate, including MFA. Access tokens issued within a session follow [[token#^token-access-ttl]].
