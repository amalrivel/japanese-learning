# Personalized Learning PWA

Private learning application with M1–M6 implemented: Firebase authentication and
UID isolation, validated pack import, practice with saved drafts, deterministic
server grading, self-assessment, immutable history review, progress aggregation,
and a read-only Teacher Report for manual JSON handoff. Release-readiness verification
(M7) and optional PWA installability (M8) remain planned. See the [implementation plan](docs/IMPLEMENTATION_PLAN.md).

## Local development

Use Node >=24.15.0 <25 and npm. `.nvmrc` selects the tested Node 24.22.1;
the verified npm version is 11.19.1. Firebase's locked Web SDK requires Node
>=24.12.0 and Firebase Admin requires >=22; the locked re2/node-gyp build
chain raises the project minimum to 24.15.0.

```sh
nvm use
npm ci
npm run dev
```

Install devDependencies before building: Tailwind, TypeScript, and the
`shadcn/tailwind.css` build stylesheet require them. Do not install production-only
dependencies before `npm run build`. Do not download a runtime automatically;
install the selected Node version explicitly if your version manager lacks it.

Open <http://localhost:3000>. `/import`, `/practice`, `/history`, `/progress`, and
`/teacher/report` are implemented. Firebase configuration and approved UIDs are required; emulator tests provide their own isolated demo configuration.
Never use production credentials or data for tests.

## Verification

```sh
npm ls --depth=0
git diff --check
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm audit --omit=dev
npm audit
npm run test:emulators
npm run test:browser:emulators
```

Emulator suites require Java 21 or newer (OpenJDK 21 is verified), the installed
Firebase CLI, and free loopback ports configured in `firebase.json`. They use only
`demo-learning-pwa`, with Auth on 127.0.0.1:9099 and Firestore on 127.0.0.1:8080.
The isolated Next test server uses port 3100. Run emulator and browser suites
sequentially; do not stop another user's server to free a port.

Browser tests use Playwright and an installed Chrome at `/usr/bin/google-chrome`,
or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, or Playwright's managed Chromium.
If needed, explicitly install the browser with `npm exec -- playwright install chromium`.
Formatting commands are `npm run format` and `npm run format:check`; avoid mass
formatting unrelated files.

The [content contract](docs/CONTENT_CONTRACT.md) defines normative data and grading
rules; [architecture](docs/ARCHITECTURE.md) defines boundaries. Historical command
and browser evidence is retained in the implementation plan. Real Google login,
production Firestore indexes, the native file picker, and BFCache are not claimed
verified by local emulator tests.
