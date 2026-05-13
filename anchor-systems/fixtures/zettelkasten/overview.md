# Auth Service Overview

The Auth Service provides centralised authentication and authorisation for all platform components. It manages user sessions, token issuance, multi-factor verification, and password lifecycle enforcement.

Sessions are bounded in duration per [[202605121001]] to limit exposure from abandoned sessions. All accounts must satisfy [[202605121004]] before registration is complete.

Multi-factor authentication is enforced on every new session as described in [[202605121003]]. The service integrates with the SMS gateway for OTP delivery and supports TOTP authenticator apps.

The service exposes a REST API and emits structured audit events for every authentication action. Downstream services must treat tokens as opaque and validate them via the `/introspect` endpoint rather than parsing them locally.
