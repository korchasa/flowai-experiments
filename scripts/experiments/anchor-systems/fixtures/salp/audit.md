# Audit Logging

[ANC:audit:retention]
All authentication events are retained for 90 days. Logs include user ID, timestamp, action, and outcome.

Events are written to an append-only log store and replicated to the SIEM within 60 seconds of occurrence. Log entries are immutable after writing; correction requires a new compensating entry with a reference to the original.

Covered events include: login success, login failure, MFA verification, password change, account lockout, token issuance, token revocation, and session termination. Access to raw audit logs is restricted to the Security team and automated compliance tooling.
