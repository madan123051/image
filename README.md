# Wildsaura Smart Life Planner

Wildsaura is a responsive bilingual life planner with an original
prehistoric-jungle identity. It combines calendars, tasks, reminders, routines,
countdowns, notification state and free-time suggestions in one workspace.

Switching the app language changes both the UI and calendar system:

- English uses Gregorian (AD) dates.
- नेपाली uses localized Bikram Sambat (BS) dates.

## Live app

Production: <https://calender.wildsaura.com>

## Phase 2 capabilities

- Firebase Anonymous Authentication with one owner-scoped workspace per UID.
- Cloud Firestore persistence for preferences, calendars, events, tasks,
  reminders, routines and notifications.
- Durable reminder and routine create/edit/complete/snooze/activation flows.
- Timezone-aware event countdowns and free-time suggestions that account for
  events, scheduled tasks and fixed routines.
- Durable in-app notification read/delivery state.
- Real-time multi-tab synchronization, IndexedDB persistence and queued offline
  writes with visible connection state.
- Server-enforced Firestore rules that deny cross-user and unknown-path access.

Anonymous sessions are local to the browser. Clearing site data or opening the
app on another browser/device creates a different UID; account linking and
cross-device recovery are planned for a later phase.

## Local setup

Requirements: a supported Node.js release and pnpm.

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Fill `.env.local` with the public Firebase Web App values before starting the
app. In Firebase Console, enable Anonymous Authentication and create the default
Firestore database. Then deploy the checked-in authorization rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project <project-id>
```

`REACT_APP_FIREBASE_*` values are embedded into the browser bundle and are not
secrets. Firestore access is protected by Firebase Authentication and
[`firestore.rules`](firestore.rules). Never place a service-account key, OAuth
client secret, database credential or private push key in a `REACT_APP_*`
variable.

For the complete path layout, offline behavior and deployment checklist, see
[`docs/FIREBASE_DATA_MODEL.md`](docs/FIREBASE_DATA_MODEL.md).

## Vercel setup

Link the checkout to the Vercel project, add each Firebase Web App variable to
Production, Preview and Development, then redeploy because Create React App reads
these values at build time:

```bash
vercel link --yes --project image --scope madan123051-9830s-projects
vercel env add REACT_APP_FIREBASE_API_KEY production preview development
vercel deploy --prod
```

Repeat `vercel env add` for every `REACT_APP_FIREBASE_*` entry in `.env.example`.
The checked-in [`vercel.json`](vercel.json) supplies the CRA output directory,
SPA fallback, service-worker cache policy and baseline response security headers.

## Scripts

```bash
pnpm dev        # development server
pnpm test:ci    # non-watch test suite
pnpm typecheck  # TypeScript validation
pnpm lint       # ESLint with zero warnings
pnpm build      # production bundle
pnpm preview    # build and serve the bundle locally
```

## Stack

- React 18, TypeScript and Create React App
- Firebase Authentication and Cloud Firestore
- Gregorian (AD) and Bikram Sambat (BS) calendar engines
- PWA application shell and static asset cache
- Vercel deployment at `calender.wildsaura.com`

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for completed
phases and the Phase 3–5 roadmap.

## License

MIT
