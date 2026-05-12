# Account Recovery

Password-reset links are valid for 24 hours and are single-use. The link is invalidated immediately on first use. ^recover-link-ttl

Reset links are delivered via email to the verified address on file. The link contains a signed token; the signature is verified server-side before allowing the password change.

After a successful reset the user must log in with the new password and complete MFA verification. All previous sessions are invalidated. The new password must satisfy [[password#^auth-password-policy]]. Recovery events are logged per [[audit#^audit-retention]].
