# Architecture

Status: target design, not implemented. Contracts are authoritative in
[CONTENT_CONTRACT.md](CONTENT_CONTRACT.md); execution gates are in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Repository evidence (2026-10-26)

This is an initialized, heavily uncommitted Next.js scaffold, not an empty project.
`package.json` declares Next 16.4.3, React 19.3.0, Firebase Web `^13.1.0`, Zod
`^4.6.7`, TypeScript 5, Tailwind 4, shadcn/Base UI, Lucide, and next-themes.
Installed Next/React/Firebase/Zod match those base versions. `package-lock.json`
is the only application package-manager lockfile; `skills-lock.json` tracks skills.
Node v24.22.1/npm 11.19.1 were observed locally, not established as project pins.
Next's installed package requires Node >=20.9.0; verify all future tooling before
choosing a supported Node LTS version for CI/Vercel.

Existing learner/management route groups, empty domain folders, theme provider,
global tokens, and local UI primitives are reusable. Most feature pages, API
handlers, and `firebase/admin.ts` are empty. Firebase client configuration is blank.
`mode-toggle.tsx` still uses Radix `asChild` against a Base UI wrapper. The PWA
manifest references absent icons; the unregistered push-worker example contains a
placeholder URL. Neither is a finished PWA. No tests, CI, Firebase rules/index
files, Admin SDK, emulator tooling, or deployment setup exists in the inspected tree.

`next.config.ts` enables cache components, partial prefetching, React Compiler,
Tailwind's Turbopack loader, and response headers. Preserve these unless a specific
verified failure requires a small correction. Read bundled Next docs first.
The initial git status includes modifications to config, manifests, CSS/layout,
deletion of `src/app/page.tsx`, and untracked routes/components/skills; do not undo them.

Documentation: README is create-next-app boilerplate (wrong current page path and
non-npm alternatives). Root AGENTS has a valid Next-managed block; no other
project agent entry files were found. Optional `.agents/skills` manuals are not
implemented architecture. Local `.env` is ignored; `.aws/` and `.codex/` are not
covered by current ignore rules. Their contents were not inspected.

## Smallest design and module ownership

One Next.js deployment on Vercel, one Firestore database, Firebase Auth, no queue,
agent runtime, ORM, or second database. Use concrete server functions rather than
a generic storage interface. Proposed organization (create files only as needed):

```text
src/app/
  (auth)/sign-in/page.tsx
  (learner)/page.tsx, practice/page.tsx, practice/[packId]/page.tsx
  (learner)/history/page.tsx, history/[attemptId]/page.tsx
  (management)/import/page.tsx, teacher/report/page.tsx
  api/packs/.../route.ts, api/attempts/.../route.ts
  api/progress/route.ts, api/teacher/context/route.ts
src/components/                 # shared UI, existing ui/ primitives and theme
src/features/
  content/                     # schema.ts, projection.ts, import UI, packs.server.ts
  practice/                    # answers.ts, grading.server.ts, attempt schema/UI,
                               # attempts.server.ts
  analytics/                   # pure summary.ts, progress.server.ts, summary UI
  teacher/                     # context schema, context.server.ts, report UI
src/lib/
  firebase/client.ts           # Web app + Auth only
  firebase/admin.ts            # server-only singleton Admin Auth + Firestore
  auth/client.tsx, auth/server.ts
  api/client.ts, api/server.ts # token request/error helpers, not a generic framework
tests/                         # unit, emulator integration, browser tests
firestore.rules, firestore.indexes.json, firebase.json # introduced in M2
```

Routes validate HTTP/auth, call feature services, and serialize safe DTOs. Pure
schema/normalization/summary logic has no Firebase or React dependencies. Persistence
stays in `*.server.ts` modules with `import 'server-only'`. Only the import UI
needs the full schema; normal practice receives a strict positive-list projection.
The JSON example is a fixture, never imported into the client application bundle.

## Authentication and data flow

1. Google sign-in uses Firebase Web Auth with browser-session persistence; no
   custom session cookie. Protected pages are public static shells with no private
   server-rendered data. Client auth gates UX; API authentication enforces access.
2. An API helper obtains a fresh SDK ID token and sends `Authorization: Bearer …`.
   Never put tokens in URLs or manually persist them. Admin verifies the token
   for the configured project, including revocation/disabled-account checking.
3. Require `APP_ALLOWED_UIDS` (comma-separated Firebase UIDs, server-only).
   Missing/empty config fails closed; an unlisted valid UID receives 403. Initial
   production list has one UID. Two allowlisted test users prove isolation.
4. Use verified `uid` to construct `users/{uid}/…` references. API schemas reject
   client ownership fields. Fetch only that path; another user's ID returns 404.
5. Import UI validates/previews locally. Confirm sends the original JSON; server
   repeats all checks, hashes canonical content, and transactionally creates
   learner pack + answer-key document. Preview never constitutes write authority.
6. Practice loads only learner pack data. Draft saves write answers, never grades.
   Submission reads the private key and computes objective results in a transaction.
   Review keys/feedback are returned only after the attempt leaves draft state.
7. Completed attempts feed a bounded skill summary and read-only teacher-context
   export. The learner manually supplies the export to ChatGPT Work.

Bearer auth avoids a second cookie/CSRF lifecycle. Require same-origin browser
mutations (reject an Origin header differing from the request's origin), JSON
content type, no credentialed cross-origin CORS, and no cookie-based API fallback.
Non-browser requests may omit Origin but must carry valid auth. Sign-out clears
all in-memory private content, pending requests, and draft state; handle account
switches the same way. Do not enable Firestore browser persistence.

## Firestore model

All paths below are beneath `users/{uid}`; no parent user document is required.

| Collection/document    | Stored data                                                                             | Trust/access                            |
| ---------------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| `packs/{packId}`       | LearnerPack v1, contentHash, importedAt                                                 | Immutable; server projects it for owner |
| `packKeys/{packId}`    | `{schemaVersion:1, packId, contentHash, keys:{[exerciseId]:answer}}`                    | Immutable; server grading/review only   |
| `attempts/{attemptId}` | Attempt v1, draft answers, immutable pack/skill metadata, results, lifecycle timestamps | Server-written; owner reads safe DTO    |

No materialized progress counters or teacher snapshot documents in MVP. Compute
from the latest 100 completed attempts; this avoids retry-induced counter drift.
History and pack lists paginate 20 at a time, hard maximum 50. Disable indexing of
large maps/arrays (`exercises`, `keys`, `answers`, `results`, `skills`) because queries
do not use them. Add indexes for attempts `status ASC, completedAt DESC, __name__ DESC`
and `packId ASC, createdAt DESC, __name__ DESC`; standalone list ordering uses
`importedAt`/`createdAt` plus document ID. Test production-required indexes separately:
emulator success alone does not prove index availability.

Firestore rules deny every direct client read/write, authenticated or otherwise.
Web SDK operations are limited to Auth for this MVP. Admin bypasses those rules,
so every service requires an authenticated UID and explicit validation; rules
cannot compensate for missing API ownership checks. Use transaction read-before-write
ordering and side-effect-free callbacks because Firestore retries callbacks.

## REST surface

All routes require auth/allowlist and return JSON. JSON fields below refer to
CONTENT_CONTRACT. No endpoint accepts a UID. Resource identifiers are validated
before constructing paths. Successful responses are direct DTOs; errors have the
envelope below. GET detail/list are read-only; no public report token or write API
for teachers exists.

| Method/path                                  | Input → output / behavior                                                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/packs/import`                     | Full LearningPack; 201 `{packId, contentHash, duplicate:false}`, identical retry 200 with `duplicate:true`, changed same ID 409                                                    |
| `GET /api/packs`                             | `limit?, cursor?` → `{items: PackSummary[], nextCursor: string                                                                                                                     | null}`; summary: id/title/subject/level/exerciseCount/importedAt/contentHash |
| `GET /api/packs/{packId}`                    | LearnerPack with contentHash/importedAt; never keys or explanations                                                                                                                |
| `POST /api/attempts`                         | `{attemptId, packId}` → 201 draft DTO; same ID/pack retry 200 existing DTO; same ID/different pack 409                                                                             |
| `GET /api/attempts`                          | `packId?, limit?, cursor?` → `{items: AttemptSummary[], nextCursor}` ordered createdAt descending; summary: id/packId/packTitle/status/createdAt/updatedAt/submittedAt/completedAt |
| `GET /api/attempts/{attemptId}`              | Draft DTO without keys, or submitted Review DTO with results and key feedback                                                                                                      |
| `PATCH /api/attempts/{attemptId}`            | `{revision, answers}` full draft snapshot → `{revision, updatedAt}`; stale 409; non-draft 409                                                                                      |
| `POST /api/attempts/{attemptId}/submit`      | `{revision, answers}` complete snapshot → Review DTO; identical committed retry 200; changed submitted answers 409                                                                 |
| `POST /api/attempts/{attemptId}/assessments` | `{ratings}` complete map for self-graded exercise IDs → completed Review DTO; identical retry 200, differing retry 409                                                             |
| `GET /api/progress`                          | ProgressSummary v1, latest 100 completed attempts                                                                                                                                  |
| `GET /api/teacher/context`                   | TeacherContext v1 for the same window; no side effects                                                                                                                             |

Cursor: opaque base64url JSON `{seconds,nanoseconds,id,packId}` containing the
previous row's exact Firestore timestamp, document ID, and pack filter (null when
absent, including pack-list cursors). Preserve sub-millisecond precision; do not
round-trip a cursor timestamp through Date/ISO strings. Validate integer timestamp
ranges, ID shape, filter equality, unknown fields, and encoded length <=1024. Build
the query afresh under the verified UID, never deserialize a document path. A
cursor is not authorization. Use deterministic timestamp/ID ordering and read one
extra row to determine whether nextCursor exists.

Error shape: `{error:{code,message,issues?:[{path,message}]}}`. Paths are JSON
field paths, not input values. Codes/statuses: `INVALID_JSON` 400,
`UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404,
`ID_CONFLICT`/`STALE_REVISION`/`INVALID_STATE` 409, `PAYLOAD_TOO_LARGE` 413,
`UNSUPPORTED_VERSION`/`VALIDATION_FAILED` 422, `UNSUPPORTED_MEDIA_TYPE` 415,
`UNAVAILABLE` 503, `INTERNAL` 500. Temporary M1/M2 placeholders use
`NOT_IMPLEMENTED` 501. Wrong methods return 405. Do not disclose raw
SDK exceptions, credentials, answers, or stack traces. Failed validation/state
transitions write nothing. Return at most 20 validation issues with a total count
in the message. Bound request streams even when Content-Length is absent.

## Security, caching, and operations

- Use Node.js Route Handlers for Admin/crypto; no Edge runtime requirement.
- Every private API response, including errors, uses
  `Cache-Control: private, no-store` and `Vary: Authorization`. Client fetch uses
  `cache:'no-store'`. No `use cache`, static export of private data, CDN cache
  override, or private service-worker caching. Report HTML is a data-free shell;
  report JSON is fetched after auth and cleared on sign-out.
- Render imported strings as React text, including rubrics/explanations. No raw
  HTML, dynamic code, remote content fetches, or actions derived from JSON text.
  Avoid logging raw import bodies, answer values, report bodies, or bearer tokens.
- Bound packs and answers per contract, lists/summary windows per above. No open
  signup/data access beyond the allowlist; do not add a distributed rate-limit
  service for a one-user MVP. Revisit abuse controls before public enrollment.
- Environment names to implement: public `NEXT_PUBLIC_FIREBASE_API_KEY`,
  `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`,
  `NEXT_PUBLIC_FIREBASE_APP_ID`; private `FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `APP_ALLOWED_UIDS`.
  Validate matching project IDs and normalize escaped private-key newlines once.
  Initialize SDK singletons lazily; builds must not require production credentials.
- Development emulators: `demo-learning-pwa`, Auth 9099, Firestore 8080, UI 4000.
  Explicit `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` only outside production;
  Admin uses `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and
  `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`. All SDK project IDs must match the demo
  project. No credentials needed locally. Reject emulator settings in production;
  missing dev configuration must not silently connect to a real project.
- Owner-controlled later setup: Firebase project/Web app, Google provider,
  authorized domains, owner UID, Firestore database/location, restricted service
  account credentials, rules/index deployment, and separate Vercel environment
  values. Never commit service-account JSON. Local `.env*` stays ignored; document
  variable names here instead of relying on a currently ignored `.env.example`.
- No deployment is authorized by this blueprint. M7 prepares release evidence;
  publishing requires a later explicit request. Never send local learning data to
  an external teacher automatically.

## Significant trade-offs and references

All-server Firestore access sacrifices realtime/offline Web SDK convenience to
centralize ownership, validation, and grading. Separate key documents reduce
accidental serialization risk. The importing learner can inspect the source file;
this is not an anti-cheating system. Immutable packs avoid regrading old attempts.
The bounded summary is honest, cheap, and rebuildable; all-time analytics can wait.
Manual report export avoids pretending a third-party authenticated browser/session
or scheduled task is guaranteed to work.

Verified official guidance (2026-10-26): [ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens),
[Admin setup](https://firebase.google.com/docs/admin/setup),
[Google sign-in](https://firebase.google.com/docs/auth/web/google-signin),
[Firestore rules and server bypass](https://firebase.google.com/docs/firestore/security/rules-conditions),
[transaction retries](https://firebase.google.com/docs/firestore/manage-data/transactions),
[Firestore limits](https://firebase.google.com/docs/firestore/quotas),
[emulator setup](https://firebase.google.com/docs/emulator-suite/install_and_configure).
Bundled version-specific Next references:
`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
and `01-app/03-api-reference/03-file-conventions/route-groups.md`.
