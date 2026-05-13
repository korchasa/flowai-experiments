# Role-Based Access Control

Admin role grants full read/write access to user management. Assignment requires existing admin approval and mandatory MFA. ^rbac-admin-role

The admin role is not self-assignable. Role assignment events are written to the audit log. Admins may delegate specific permissions to sub-roles but may not delegate the admin role itself.

All admin operations require an active MFA-verified session. The MFA requirement for admin access is enforced server-side and cannot be waived by client configuration — see [[auth#^auth-mfa-required]].
