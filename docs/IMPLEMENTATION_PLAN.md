# Smart Life Planner implementation plan

## Current architecture

Aayoj is a Create React App/TypeScript planner designed by Wildsaura and deployed on Vercel. Firebase
Anonymous Authentication supplies a stable browser-local user ID, and Cloud
Firestore stores all planner data beneath `users/{uid}`. Real-time listeners
hydrate the shared planner store and expose cached/pending-write state to the UI.
Firestore's persistent IndexedDB cache supplies the offline mutation queue.

Every persisted record is owner-scoped. Deployed Firestore Security Rules check
the authenticated path UID, ownership fields, document IDs, allowed keys, field
types and bounded values. Firebase client configuration is build-time public
configuration; server credentials and private keys are never shipped to the
browser. See [the Firebase data model](FIREBASE_DATA_MODEL.md).

AI and smart scheduling continue to return proposals. Moving, deleting, sharing
or otherwise applying data changes requires explicit user action.

## Phase 1 — complete

1. Responsive Aayoj shell with desktop sidebar, mobile navigation, search,
   theme control and English/नेपाली language switching.
2. Gregorian (AD) and Bikram Sambat (BS) calendar day, week, month and agenda
   views with event create/edit/duplicate/complete/delete flows.
3. Today dashboard, tasks, conflict checks, scheduling suggestions, typed domain
   contracts, PWA shell, automated tests and production build.

## Phase 2 — complete

1. Firebase anonymous sessions and owner-scoped Firestore persistence.
2. Durable reminder create/edit/complete/snooze flows with recurrence data.
3. Durable fixed/flexible routines with activation and editing controls.
4. Timezone-aware countdowns and refined free-time calculation across events,
   scheduled tasks and fixed routines.
5. Centralized, durable in-app notification records with read/delivery state.
6. Firestore real-time synchronization, persistent offline cache, queued
   mutations and visible sync state.
7. Strict Firestore rules, checked-in index configuration, Vercel build/runtime
   configuration and production environment-variable setup.

The Phase 2 notification scope is in-app delivery (plus local browser alerts
while the app is open and permission is granted). Background web push and email
workers remain Phase 5 work.

## Remaining phases

- **Phase 3:** natural-language Quick Add, AI planner, smart rescheduling and
  provider-backed assistants with proposal/approval audit logs.
- **Phase 4:** recoverable accounts, shared calendars, invitations, roles and
  server-enforced collaboration/privacy rules.
- **Phase 5:** Google/Outlook synchronization, Apple-compatible ICS, background
  push/email delivery and conflict-resolution workers.

## Production

The Vercel production URL is <https://calender.wildsaura.com>. Git-linked preview
deployments are used for pull requests; the production alias is updated only
after the build and validation gates pass.
