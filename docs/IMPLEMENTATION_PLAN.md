# Luna 6 execution plan

Status: planning complete; implementation has not started. Run one milestone at a
time in dependency order. Do not infer completion from a checked box without
recorded command/browser evidence. Contracts take precedence over incidental
starter examples. Read [PRD](PRD.md), [architecture](ARCHITECTURE.md), and
[content contract](CONTENT_CONTRACT.md) before editing application code.

## Progress

| Milestone | Status | Evidence/blocker |
| --- | --- | --- |
| Planning/handoff | Complete | Six artifacts inspected; example and preservation checks performed during planning |
| M1 Runnable baseline | Complete | 2026-10-26: added the npm typecheck command, navigable root shell, page placeholders, private/no-store 501 API placeholders, Base UI `render` trigger, app metadata, and npm-only README. `npm ls --depth=0`, `git diff --check`, `npm run lint` (0 errors; one existing unused `app` warning in `src/lib/firebase/client.ts`), `npm run typecheck`, and configured `npm run build` all exit 0. Next's installed docs support Webpack as a builder option; the default Turbopack build was separately attempted and blocked by sandbox port binding, so `build` uses `next build --webpack`. A dev server already occupied localhost:3000; its five required routes returned 200, all three placeholder API methods returned 501 with `Cache-Control: private, no-store` and `Authorization` in `Vary`, and the browser showed the theme menu with no console errors. Starting another dev server was prevented by the occupied port; no tests are installed for M1. M2 may proceed. |
| M2 Auth and trusted persistence foundation | Not started | Depends on M1; emulator tooling required |
| M3 Validated import | Not started | Depends on M2 |
| M4 Practice and draft persistence | Not started | Depends on M3 |
| M5 Grading and durable review | Not started | Depends on M4 |
| M6 Progress and teacher export | Not started | Depends on M5 |
| M7 Full-loop verification and release readiness | Not started | Depends on M6; hosted smoke checks need owner configuration |
| M8 Installability | Deferred | Optional only after M7; no offline sync |

Planning audit (2026-10-26): one-off Node assertions validated all example fields,
limits, references, the five grading variants (three objective/two self-graded),
and both documented JSON snippets. Python checks verified local links, milestone
fields, preservation of the original AGENTS block, and unchanged hashes for all
39 existing application/configuration files. No app lint/build/test suite was run;
the runtime Zod contract and test harness are future implementation tasks.

After each milestone replace its status and add date, changed files, commands with
exit status, browser cases, and unresolved risks. Keep the next milestone blocked
until the predecessor's Definition of Done is met. If an external gate blocks M7,
record it as incomplete; do not label the product release-ready or proceed to M8.

## Verification tooling (planned, not present today)

Currently available: `npm run dev`, `npm run lint`, `npm run build`, `npm start`.
Do not run an application initializer. Use existing lockfile and strict TypeScript.

M1 adds `typecheck`: `next typegen && tsc --noEmit`. Existing generated `LayoutProps`
needs Next type generation. Use installed CLIs through npm scripts, not downloaded
replacement versions. Inspect existing `next.config.ts` and bundled docs before
changing config. A remote font download/build network failure is an environment
blocker to record, not permission to silently change the design.

M2 introduces these dependencies only after checking their current official Node
requirements and compatibility (resolve/lock versions with npm; no guessed pins):

```sh
npm install firebase-admin server-only
npm install --save-dev vitest firebase-tools @firebase/rules-unit-testing
```

Vitest is for pure TS and HTTP/integration tests; no React Testing Library, jsdom,
Vite React plugin, or alias plugin is needed for those tests. Configure `@/` using
the runner's built-in alias option. Exercise server-only code through HTTP so the
test runner does not need to bypass server-only module protections. Add scripts:

- `test:unit`: `vitest run tests/unit`
- `test:integration`: `vitest run tests/integration`
- `test:rules`: `vitest run tests/rules`
- `emulators`: `firebase emulators:start --project demo-learning-pwa --only auth,firestore`
- `test:emulators`: `firebase emulators:exec --project demo-learning-pwa --only auth,firestore "npm run test:integration && npm run test:rules"`

Integration tests start/stop one isolated Next process on port 3100, wait for
readiness, use only the demo project, and clean test namespaces between cases.
Seed two fixed-UID users using Admin Auth, obtain emulator ID tokens using
email/password REST login, and supply both UIDs to the test app allowlist. This
test-only login does not enable another production Auth provider. Refuse to run
destructive test cleanup unless both emulator hosts and the demo project match.
M2's first unit tests cover environment/allowlist validation; later milestones
extend the same suite. Install a Java runtime compatible with the selected
Firestore emulator if absent; verify `java -version`, do not assume it exists.

M7 adds only `@playwright/test` as a dev dependency and a `test:e2e` npm script.
Use `npm exec -- playwright install chromium` to obtain the needed browser when
permitted. The browser harness creates emulator identities without a production
auth bypass, launches its own test app, and shares the demo-only safety guard.
`test:e2e:emulators` wraps the browser run with the same emulator exec command.
Use official Next testing guidance for runner compatibility; do not test async
Server Components with a simulated unit DOM.

## M1 — Restore a runnable baseline (FIRST)

**Goal:** preserve useful uncommitted scaffolding and establish a clean, runnable
shell before any backend or learning feature. **Prerequisites:** repository access,
Node/npm matching installed requirements; no Firebase project or credentials.

**Expected files:** `package.json` (typecheck script), any affected empty
`src/app/**/page.tsx` and `route.ts`, `src/components/mode-toggle.tsx`, small
existing lint/type failures, and README's stale local setup instructions.
Touch `next.config.ts`/lockfile only if an observed failure requires it.

**Tasks:**

- [ ] Capture `git status --short` and diff; distinguish preexisting changes from
  your edits. Confirm `node --version`, `npm --version`, installed Next docs,
  package/lock consistency. Run `npm ci` only if dependencies need installing.
- [ ] Add typecheck script; run lint, typecheck, and build to record actual failures.
- [ ] Give empty page files a minimal default placeholder component; empty API
  files get explicit 501 JSON responses with private/no-store headers. Keep all
  APIs unavailable until their authenticated implementation milestone. Avoid
  inventing feature UI or deleting the route skeleton.
- [ ] Correct Base UI trigger composition (`render`, not Radix `asChild`) and
  other demonstrated lint/type/build blockers with the smallest changes.
- [ ] Make `/` a navigable shell linking the placeholder learner/import/report
  routes. Preserve existing UI/theme. Update README to npm-only verified commands,
  correct `src/app/(learner)` location, and links to these docs; no deployment claims.

**Acceptance/verification:** `npm run lint`, `npm run typecheck`, and
`npm run build` pass. `npm run dev` serves `/`, `/practice`, `/history`, `/import`,
and `/teacher/report` as shells; theme menu has no runtime console error; unfinished
APIs return 501 and disclose nothing. No Firebase/LLM keys needed for these checks.
**Definition of Done:** evidence recorded, no initializer/dependency replacement,
no unrelated work reverted, and baseline failures are fixed or explicitly block M2.

## M2 — Authentication, emulator tests, and server trust boundary

**Goal:** establish verified user access before any data-bearing API.
**Prerequisite:** M1. **Expected files:** Firebase/auth/api modules under `src/lib`,
sign-in route and protected client shell, all existing API placeholders,
`firestore.rules`, `firestore.indexes.json`, `firebase.json`, `vitest.config.*`,
tests/helpers plus unit/integration/rules tests, package/lock, `.gitignore` for new
emulator outputs. Do not overwrite `.aws/` or `.codex/`; add appropriate ignore
entries only after confirming they contain no intended tracked project files.

**Tasks:**

- [ ] Add the M2 dependencies/scripts; configure Auth/Firestore emulators with the
  explicit demo project, loopback ports, deny-all rules, and planned indexes.
- [ ] Implement lazy singleton SDK setup, environment validation, production
  emulator rejection, and server-only module boundaries. No production credentials
  are required for builds or demo tests.
- [ ] Implement Google login/logout and session auth state; provide visible
  sign-in/loading/error states and clear private in-memory data on account changes.
- [ ] Implement shared verified-bearer/allowlist guard, JSON byte limits/error
  envelope, Origin check, no-store responses, and UID-scoped service entry points.
  Guard every API placeholder before its 501 response; use GET packs as the first
  authenticated endpoint returning an empty, bounded list.
- [ ] Add environment/allowlist unit tests; rules tests denying all client access;
  HTTP tests for missing/invalid tokens, unapproved user, approved users, wrong
  project/disabled users where supported, and safe failure without configuration.

**Acceptance/verification:** baseline commands, `npm run test:unit` and
`npm run test:emulators` pass. Anonymous API is 401, valid unlisted UID is 403,
approved users get their own empty list, client Firestore reads/writes fail, and
no test touches a real project. Check auth errors cannot leak tokens or SDK details.
**Definition of Done:** security foundation tests pass before implementing import.

**External gate (later, not during planning):** owner must create/configure Firebase
project, Google provider, Web app/domains, Firestore location, service-account
credentials, and one allowlisted UID before real Google-login validation. Emulator
work may finish first; production revocation behavior must be checked in M7 if
emulators cannot model it. Do not invent credentials or enable public enrollment.

## M3 — Strict content import with preview and idempotency

**Goal:** import one valid immutable pack safely. **Prerequisite:** M2.
**Expected files:** `src/features/content/{schema,projection,packs.server}.*`, import
UI, `/api/packs/import`, pack list/detail routes, example-based fixtures/tests.

**Tasks:**

- [ ] Implement all v1 fields, discriminated unions, cross-references, limits,
  explicit version rejection, and canonical hashing from CONTENT_CONTRACT.
- [ ] Implement JSON file/paste input and one shared preview; errors identify
  fields without echoing untrusted values as HTML. Confirm/cancel before writes.
- [ ] Atomically persist projected learner pack and separate keys. Enforce same
  ID/hash duplicate and changed-ID-content conflict policy; discard raw import
  state on success/cancel. Implement bounded lists and cursor validation.
- [ ] Test real example, non-Japanese fixture, malformed JSON, depth/size including
  chunked bodies, invalid versions/IDs/references/choices, unknown nested fields,
  unsupported exercise types, normalized duplicate answers, and adversarial strings.
- [ ] Test two concurrent imports, whitespace/key-order equivalence, hash-changing
  content conflict, isolation, atomic failure, and positive-list key redaction.

**Acceptance/verification:** baseline + unit + emulator suites pass. Both input
paths import the same example; cancel/invalid input writes nothing; duplicate
import preserves importedAt; no practice/list DTO contains an answer/explanation.
Render `<script>`/instruction-like strings inertly. **Definition of Done:** import
and retrieve are complete and tested; no grading/session feature added early.

## M4 — Practice renderer and saved draft sessions

**Goal:** answer and resume all supported types without seeing keys.
**Prerequisite:** M3. **Expected files:** `src/features/practice` answer schema,
session/renderer UI and persistence; learner practice/history pages;
`/api/attempts` GET/POST and detail GET/PATCH routes; tests.

**Tasks:**

- [ ] Render choice, one-blank, exact/self short-answer, and self-review inputs
  with associated labels, keyboard navigation, focus/error states, and plain text.
- [ ] Start UUID-based attempts idempotently; persist partial answer snapshots
  with revisions. Serialize autosaves, show saved/saving/failed status, provide
  explicit Save, and warn before leaving with unsaved work.
- [ ] Implement resume/history with pagination and optional pack filter. Refetch
  on stale revision and preserve recoverable local text; do not auto-overwrite.
- [ ] Test wrong answer shapes/unknown exercise IDs, repeated start, same UUID
  wrong pack, two-tab stale saves, account switching, lost-response retry recovery,
  and attempts belonging to another UID. Submit remains unavailable until M5.

**Acceptance/verification:** baseline/unit/emulator suites; browser answers all
five example variants, acknowledges Save, reloads/resumes exact saved choices/text;
network failure visibly reports unsaved state; draft responses contain no keys.
**Definition of Done:** durable drafts and safe rendering verified without offline
storage, grading, or new frameworks.

## M5 — Deterministic grading and immutable review

**Goal:** finish attempts, grade objective answers, and record honest self-review.
**Prerequisite:** M4. **Expected files:** grading/attempt lifecycle modules,
submit/assessments routes, results UI, history detail page, test fixtures.

**Tasks:**

- [ ] Implement documented normalization and objective grading; no fuzzy/AI grading.
  Unit cases include NFKC full-width text, whitespace, case, punctuation mismatch,
  missing answers, and multiple accepted answers.
- [ ] Validate/freeze complete answers and compute results transactionally.
  Introduce objective-only completion and awaiting_self_review → completed states.
- [ ] Reveal feedback only for submitted attempts; collect all self ratings once.
  Serialize saves before submit, retain latest revision, and surface conflicts.
- [ ] Test concurrent/retried submit and assessment, different retry payloads,
  malformed ratings, stale revision, no edits after completion, and key/score/UID
  injection. Grade results must come from stored keys, never the client.

**Acceptance/verification:** baseline/unit/emulator suites pass. Example produces
three objective outcomes and two pending self ratings; after rating, all five
results survive reload and review. Objective-only fixture completes at submit.
Repeated submission/assessment changes neither totals nor lifecycle timestamps.
**Definition of Done:** history is reviewable, state machine/idempotency tests
pass, and all pre-submission key-leak tests remain green.

## M6 — Skill progress and read-only Teacher Report

**Goal:** close the manual teacher feedback loop. **Prerequisite:** M5.
**Expected files:** analytics summary/service/UI, teacher schema/service/report UI,
progress and existing teacher/context route, unit/integration tests.

**Tasks:**

- [ ] Aggregate exactly the documented latest-100 completed window, separating
  objective counts/accuracy from self ratings, with stable subject/skill IDs.
- [ ] Build TeacherContext v1 from the same query; add at most 20 completed-work
  mistake samples, truncation markers, and static nextPackConstraints. No identity
  credentials, drafts, raw input instructions, or public sharing token.
- [ ] Render owner-only report data after auth; add copy and JSON download via
  platform APIs. Label window, truncation, untrusted content, and manual handoff.
- [ ] Test zero data, all-self data, mixed subjects, multi-skill counting, repeated
  attempts, label changes, 101+ completions, timestamp ties, incomplete sessions,
  truncation, two-user isolation, and exact report-schema validation.

**Acceptance/verification:** baseline/unit/emulator suites; report/progress counters
match fixtures; GET report makes no Firestore writes; 401/403/404 ownership behavior
and no-store headers verified. Copy/download parses; manual teacher input produces
a new-ID pack that validates and imports. Use a prepared second pack if live
ChatGPT is unavailable; no live LLM dependency is a release gate.
**Definition of Done:** all MVP capabilities exist, with completed-work-only
teacher handoff; no automatic integration or public report introduced.

## M7 — Full-loop security and release-readiness verification

**Goal:** verify the complete user flow and operational prerequisites.
**Prerequisite:** M6; owner configuration required for real-provider/index checks.
**Expected files:** Playwright config/tests and package/lock, minimal CI workflow,
README operational setup, this plan's evidence/status. No new product capabilities.

**Tasks:**

- [ ] Add the browser tooling described above; test file upload and paste, errors,
  confirmation, duplicates, all renderers, saved resume, grading, self-review,
  history, progress, and report copy/download. Run keyboard/mobile-width checks.
- [ ] Browser/network tests prove practice/draft/RSC payloads and preloaded data
  contain no keys, untrusted text cannot execute, auth switch clears data, and a
  second UID cannot read/write the first user's resources. Verify report HTML,
  JSON, error responses, and browser back/sign-out behavior do not expose cached
  data. Admin credentials and example answer fixtures must not enter client bundles;
  public Firebase Web configuration is expected there.
- [ ] CI runs npm ci, lint, typecheck, unit tests, emulator integration/rules,
  build, and the small browser loop using supported Node/Java versions. Use no
  real credentials in CI. Include emulator binaries/browser availability explicitly.
- [ ] Prepare owner setup/release checklist: separate Vercel env scopes, Google
  domains, allowlist, Firestore rules/indexes, secret handling, index query smoke
  checks, real token revocation/disabled-user behavior, HTTPS/no-store headers.
  No deployment or resource provisioning without a later explicit request.

**Acceptance/verification:** all baseline scripts + `npm run test:unit`,
`npm run test:emulators`, `npm run test:e2e:emulators` pass; full loop uses no OpenAI
key and no live LLM. Document separately any production-equivalent smoke tests
that need owner configuration; never infer those from emulator success.
**Definition of Done:** reproducible full-loop/security evidence plus verified
owner-configured runtime/index/auth readiness. If no hosted environment is
authorized/available, record the external gate and leave M7 incomplete; deployment
is a separate user action, not an implied task.

## M8 — Optional PWA installability, after the verified core

**Goal:** installable online application, without claiming offline learning.
**Prerequisite:** M7 and an authorized HTTPS test environment (localhost for local
browser checks). **Expected files:** manifest, real icons, app metadata, and only
if the target browser requires it, a minimal service worker and registration.

**Tasks:** replace placeholder metadata/assets; remove/replace the unused push
example only within this milestone; verify target-browser installation criteria
before adding worker code. Do not cache APIs, report pages, authenticated payloads,
or answers. No push permission, offline queue, background sync, or LLM schedule.
Show an online-required state when unavailable.

**Acceptance/verification:** baseline scripts plus manifest/icon checks, browser
install/open check, sign-out/back privacy check, and offline failure display. If a
worker exists, network inspection proves private routes never enter Cache Storage.
**Definition of Done:** installation works in the recorded browser/version and
online-only limitations are documented; no full offline scope has slipped in.
