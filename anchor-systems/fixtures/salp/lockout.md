# Account Lockout

[ANC:auth:lockout-rule]
Accounts are locked for 15 minutes after 5 consecutive failed login attempts.

The failed-attempt counter is per user account, not per IP address. The counter resets to zero on a successful login. During the lockout period all login attempts return 403 with a `Retry-After` header indicating the remaining lockout duration.

Lockout events are subject to rate limiting enforced at the network edge — see [REF:rate:login-limit | login rate limit]. All lockout events are recorded in the audit log per [REF:audit:retention | audit retention policy].
