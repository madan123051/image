# Smart Life Planner implementation plan

## Repository assessment

The existing project is a Create React App application using React 18 and `react-scripts` 5. It currently contains one bilingual Gregorian/Bikram Sambat month calendar, a Wildsaura theme, and focused date tests. It has no router, backend, authentication provider, database, durable persistence, notification worker, PWA manifest, or service worker.

The working calendar and bilingual behavior remain part of the product. Phase 1 expands them instead of replacing them with an unrelated starter.

## Architecture decisions

- TypeScript is used for strict domain and service contracts.
- UI state is organized through a single planner hook and modular pages/components.
- Demo data is held in a user-scoped in-memory adapter. It is intentionally not described as production persistence.
- Authentication, AI, notifications, calendar sync, and repository access are provider-neutral interfaces.
- Every data model includes `userId` or calendar membership ownership. Server adapters must scope every read/write by the authenticated user.
- The normalized SQL schema lives in `database/schema.sql`; it is ready for a server-side SQLite/D1 adapter or translation to PostgreSQL.
- AI and smart scheduling return proposals. Applying, moving, deleting, or sharing data always requires explicit user confirmation.

## Phase 1 — core vertical slice

1. Responsive shell with desktop sidebar, tablet behavior, mobile bottom navigation, search, theme and bilingual controls.
2. Today dashboard with real summary calculations, countdown, free-time calculation, timeline events and scheduled tasks.
3. Calendar day, week, month and agenda views with create, edit, duplicate, complete and delete flows.
4. Conflict detection with explicit “save anyway” confirmation.
5. Task manager with filters, status/priority, completion and free-time scheduling suggestions.
6. Typed domain models and service boundaries for auth, data, tasks, calendar, AI, notifications and external calendar providers.
7. PWA manifest, offline application shell and cached static calendar assets.
8. Automated tests, strict type-check, lint and production build.

## Phase 1 backend boundary

The current repository is a static frontend and has no trusted server environment. Secure email/password, Google and Apple authentication require a selected identity/backend provider and its server-side secrets. Phase 1 therefore includes:

- production-shaped auth and repository interfaces;
- a visible demo session for the frontend build;
- a normalized schema with user ownership and membership boundaries;
- no fake client-only password validation and no hardcoded OAuth/API secrets.

Before production data is enabled, select one backend/auth deployment path (for example a server API with PostgreSQL, Supabase, Firebase, or a Sites D1/SIWC deployment), then implement the matching adapters and server-side authorization tests.

## Later phases

- Phase 2: durable reminders, routines, countdowns, centralized notification delivery, free-time finder refinements and offline mutation queue.
- Phase 3: natural-language Quick Add, AI planner, smart rescheduling and assistant providers with proposal/approval audit logs.
- Phase 4: shared calendars, invitations, roles and server-enforced privacy.
- Phase 5: Google/Outlook sync, Apple-compatible ICS, push/email delivery and conflict-resolution workers.
