# Account Recovery

**UID: 202605121015**
Password-reset links are valid for 24 hours and are single-use. The link is invalidated immediately on first use.

Reset links are delivered via email to the verified address on file. The link contains a signed token; the signature is verified server-side before allowing the password change.

After a successful reset the user must log in with the new password and complete MFA verification. All previous sessions are invalidated. The new password must satisfy [[202605121004]]. Recovery events are logged per [[202605121014]].
