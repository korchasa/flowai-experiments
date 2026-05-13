# Password Policy

[ANC:password-policy]
Passwords must be ≥12 characters and include at least one digit, one uppercase letter, and one special character. No password may be reused within the last 10 cycles.

The password strength check is applied at registration and at every password change. Passwords that do not satisfy the policy are rejected with a 422 response and a list of failing criteria.

Password history is stored as salted SHA-256 hashes; plaintext is never retained. Enforcement details are implemented in `password_utils.py`. Account lockout after repeated failures is described in [REF:lockout-rule | lockout policy].
