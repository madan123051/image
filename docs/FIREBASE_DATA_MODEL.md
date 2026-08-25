# Firebase data model and security boundary

Wildsaura uses Firebase Authentication and Cloud Firestore for its Phase 2
persistence layer. The current release signs each browser into Firebase
anonymously, then stores every planner document below that Firebase user's UID.

## Document layout

```text
users/{uid}
├── preferences/current
├── metadata/workspace
├── calendars/{calendarId}
├── events/{eventId}
├── tasks/{taskId}
├── reminders/{reminderId}
├── routines/{routineId}
└── notifications/{notificationId}
```

| Path | Purpose | Ownership field |
| --- | --- | --- |
| `users/{uid}` | Anonymous user's planner profile | `id == uid` |
| `preferences/current` | Language, timezone, work/sleep hours and defaults | `userId == uid` |
| `metadata/workspace` | One-time seed/schema marker | `userId == uid` |
| `calendars/{calendarId}` | Calendar definitions and visibility | `userId == uid`, `id == calendarId` |
| `events/{eventId}` | Events, countdown flags and event reminders | `userId == uid`, `id == eventId` |
| `tasks/{taskId}` | Tasks, scheduling and subtasks | `userId == uid`, `id == taskId` |
| `reminders/{reminderId}` | Durable reminders, recurrence and snooze state | `userId == uid`, `id == reminderId` |
| `routines/{routineId}` | Durable fixed/flexible routines | `userId == uid`, `id == routineId` |
| `notifications/{notificationId}` | Durable in-app notification outbox/read state | `userId == uid`, `id == notificationId` |

The workspace marker uses schema version `2`. On a UID's first session the app
creates the profile, preferences, starter records and marker in one Firestore
batch. Later sessions hydrate from the existing documents instead of reseeding.

## Authorization and validation

[`firestore.rules`](../firestore.rules) is the server-enforced authorization
boundary. A request must be authenticated and `request.auth.uid` must equal the
`{uid}` in the path. Writes also require the document ownership fields and
document ID to match that UID/path. Each supported record has an allowlist of
fields, field types, enumerated values and conservative size/range limits.
Unknown root documents, unknown user subcollections and global collection-group
writes are denied.

Firebase Web App configuration is intentionally available to the browser. It
identifies the Firebase project; it does not authorize access. Authentication
and deployed Firestore Security Rules enforce access. Do not put service-account
keys, OAuth client secrets or private push keys in any `REACT_APP_*` variable.

## Offline and synchronization behavior

Firestore's persistent browser cache is enabled with multi-tab coordination when
IndexedDB is available. The UI applies local changes immediately, marks pending
writes, and lets the Firestore SDK send the mutation queue after connectivity
returns. Snapshot metadata distinguishes cached results and pending writes from
fully synchronized server state. The service worker separately caches only the
application shell and static assets; it is not the planner database.

Anonymous authentication persists locally in the browser. Clearing site data or
using another browser/device creates a different anonymous UID, so those records
will not follow the user. Account linking and recovery are future authentication
work; the current release must not be presented as a recoverable cross-device
account.

## Firebase project setup

1. Register a Firebase Web App, create the default Firestore database and enable
   the **Anonymous** sign-in provider.
2. Copy `.env.example` to `.env.local` and fill the seven
   `REACT_APP_FIREBASE_*` values from the Web App configuration.
3. Deploy the checked-in rules and indexes:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes --project <project-id>
   ```

4. Add the same public Firebase variables to Vercel's Production, Preview and
   Development environments. Create React App embeds `REACT_APP_*` values at
   build time, so redeploy after changing them.

References: [Firebase Web setup](https://firebase.google.com/docs/web/setup),
[anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth),
[offline persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline),
and [Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions).
