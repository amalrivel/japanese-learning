# Personalized Learning PWA

An early shell for a private learning app. Product scope and implementation
status are documented in the [PRD](docs/PRD.md), [architecture](docs/ARCHITECTURE.md),
[content contract](docs/CONTENT_CONTRACT.md), and [implementation plan](docs/IMPLEMENTATION_PLAN.md).

## Local development

Use the Node version supported by the installed Next.js package (Node 20.9 or
newer) and npm:

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. The root workspace links to `/practice`, `/history`,
`/import`, and `/teacher/report`. These are placeholders; unfinished API routes
return `NOT_IMPLEMENTED` until their milestones are implemented.

Available checks:

```sh
npm run lint
npm run typecheck
npm run build
```

The app routes live under `src/app`, including the learner routes in
`src/app/(learner)` and management routes in `src/app/(management)`. Follow
`docs/IMPLEMENTATION_PLAN.md` one milestone at a time.
