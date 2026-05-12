# Account Lockout

**UID: 202605121002**
Accounts are locked for 15 minutes after 5 consecutive failed login attempts.

The failed-attempt counter is per user account, not per IP address. The counter resets to zero on a successful login. During the lockout period all login attempts return 403 with a `Retry-After` header indicating the remaining lockout duration.

Lockout events are subject to rate limiting enforced at the network edge — see [[202605121010]]. All lockout events are recorded in the audit log per [[202605121014]].
