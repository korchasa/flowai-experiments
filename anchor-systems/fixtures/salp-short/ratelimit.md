# Rate Limiting

[ANC:otp-window]
OTP codes are valid for a 90-second window. This window is shared with the session:otp-ttl to ensure consistency.

The window is enforced server-side using the OTP creation timestamp stored in the session. Clients presenting codes outside the window receive a 422 response.

[ANC:login-limit]
Maximum 5 login attempts per 10-minute sliding window per IP address.

The sliding window counter is maintained in Redis with a TTL equal to the window duration. Exceeding the limit returns 429 with a `Retry-After` header. IP-level limits are independent of account-level lockout. SMS OTP delivery rate limits are defined in [REF:sms-otp | SMS OTP rules].
