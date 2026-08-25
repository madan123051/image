# External configuration handoff

The Phase 1 client runs without secrets by using an explicitly named demo session and seeded user-scoped data. Production authentication and persistence must be connected to a trusted backend before accepting real user data.

## Browser-safe configuration

Copy `.env.example` to `.env.local` and provide only public values:

- `REACT_APP_API_BASE_URL`
- Google OAuth public client ID
- Apple public service/client ID
- public VAPID key for web push

CRA exposes every `REACT_APP_*` value to the browser. Never use these variables for secrets.

## Trusted backend configuration

The selected backend will need:

- database connection/binding and migration execution for `database/schema.sql`;
- session signing and encryption secrets;
- email/password provider configuration;
- Google and Apple OAuth client secrets and callback URLs;
- server-side AI provider key and selected provider/model mapping;
- SMTP/email provider credentials;
- private VAPID key or push provider credentials;
- Google Calendar and Microsoft Graph OAuth scopes/secrets when sync is enabled.

All read/write queries must derive `userId` from the verified server session. A client-supplied user ID is never an authorization boundary.
