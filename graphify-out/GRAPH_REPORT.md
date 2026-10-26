# Graph Report - japanese-learning  (2026-10-26)

## Corpus Check
- 72 files · ~54,808 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 2, (none) 1, .ico 1)

## Summary
- 257 nodes · 273 edges · 44 communities (15 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project Configuration
- Learner Interface
- Showcase Color Tools
- Component Aliases
- Shared UI Primitives
- TypeScript Configuration
- Runtime Dependencies
- Authentication Security
- Radix Migration Guides
- Build Dependencies
- Showcase Coverage Script
- shadcn Documentation
- Next.js App Setup
- Learning Product Requirements
- Attempt API
- Accessible Dialog Composition
- Accessible Form Patterns
- Component Styling
- Architecture Boundaries
- Repository Guidance
- Skill Metadata
- shadcn Logo Asset
- Dark shadcn Logo Asset
- shadcn MCP Guide
- Icon Usage Guidance
- Implementation Milestones
- File Icon Asset
- Globe Icon Asset
- Next.js Logo Asset
- Vercel Logo Asset
- Window Icon Asset
- Local Development Setup
- Project Overview

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Radix to Base UI Migration Guide` - 9 edges
3. `react` - 8 edges
4. `ModeToggle()` - 8 edges
5. `cn` - 7 edges
6. `tailwind` - 6 edges
7. `aliases` - 6 edges
8. `scripts` - 6 edges
9. `shadcn UI Guide` - 6 edges
10. `next` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Security Invariants` --semantically_similar_to--> `Verified Token Ownership Boundary`  [INFERRED] [semantically similar]
  AGENTS.md → docs/ARCHITECTURE.md
- `Security Invariants` --conceptually_related_to--> `Private Response Cache Restrictions`  [INFERRED]
  AGENTS.md → docs/ARCHITECTURE.md
- `Target Layer Boundaries` --references--> `System Boundaries and API Architecture`  [EXTRACTED]
  AGENTS.md → docs/ARCHITECTURE.md
- `Home()` --calls--> `ModeToggle()`  [EXTRACTED]
  src/app/(learner)/page.tsx → src/components/mode-toggle.tsx
- `Radix to Base UI Migration Guide` --references--> `Class String Rewrites`  [EXTRACTED]
  .agents/skills/migrate-radix-to-base/SKILL.md → .agents/skills/migrate-radix-to-base/class-mapping.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MVP Learning Data Flow** — docs_prd_learningloop, docs_architecture_authenticatedroutehandlers, docs_contentcontract_versionedlearningpack [INFERRED 0.75]
- **MVP Security Boundary** — agents_securityinvariants, docs_architecture_serverownershipboundary, docs_contentcontract_answerkeyprojection [EXTRACTED 1.00]

## Communities (44 total, 29 thin omitted)

### Community 0 - "Project Configuration"
Cohesion: 0.07
Nodes (26): eslintConfig, name, private, scripts, build, dev, lint, start (+18 more)

### Community 1 - "Learner Interface"
Cohesion: 0.13
Nodes (11): lucide-react, Home(), routes, ModeToggle(), Button(), buttonVariants, DropdownMenu(), DropdownMenuContent() (+3 more)

### Community 2 - "Showcase Color Tools"
Cohesion: 0.13
Nodes (14): ColorPair(), contrast(), luminance(), toHex(), toRgb(), defaultStates, next-themes, react (+6 more)

### Community 3 - "Component Aliases"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 4 - "Shared UI Primitives"
Cohesion: 0.14
Nodes (9): @base-ui/react, class-variance-authority, cn, Field(), FieldLabel(), FieldSeparator(), fieldVariants, Label() (+1 more)

### Community 5 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @base-ui/react, class-variance-authority, cn, firebase, lucide-react, next, next-themes (+5 more)

### Community 7 - "Authentication Security"
Cohesion: 0.22
Nodes (6): Authenticated Route Handlers, Firebase Authentication, Deterministic Answer Grading, Pack Validation and Canonical Hashing, Versioned Learning Pack Contract, Authentication and Security Milestones

### Community 8 - "Radix Migration Guides"
Cohesion: 0.22
Nodes (10): Class String Rewrites, Consumer Side Prop Changes, Disclosure and Toggle Mappings, Progress, Scroll and Form Mappings, Form Control Mappings, Menu Family Mappings, Overlay Mappings, Radix to Base UI Migration Guide (+2 more)

### Community 9 - "Build Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @types/node, @types/react (+2 more)

### Community 10 - "Showcase Coverage Script"
Cohesion: 0.22
Nodes (6): components, missing, source, [uiArg, ...roots], uiDir, walk()

### Community 11 - "shadcn Documentation"
Cohesion: 0.29
Nodes (8): shadcn CLI Reference, shadcn Customization and Theming, Design System Workflow, Design System Page Guide, Registry Authoring and Addresses, Base vs Radix UI, Chat and Messaging Components, shadcn UI Guide

### Community 12 - "Next.js App Setup"
Cohesion: 0.25
Nodes (3): nextConfig, next, metadata

### Community 13 - "Learning Product Requirements"
Cohesion: 0.29
Nodes (6): Learning Loop Milestones, Full Loop Security Verification, External Teacher Handoff, Import Practice Review Learning Loop, Learner Self Assessment, Personalized Learning PWA MVP

### Community 14 - "Attempt API"
Cohesion: 0.83
Nodes (3): GET(), POST(), unavailable()

## Knowledge Gaps
- **49 isolated node(s):** `react-dom`, `shadcn`, `tw-animate-css`, `zod`, `@tailwindcss/turbopack` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 175 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Showcase Color Tools` to `Project Configuration`, `Learner Interface`, `Shared UI Primitives`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `react-dom`, `shadcn`, `tw-animate-css` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Runtime Dependencies` to `Project Configuration`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `Learner Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Next.js App Setup` to `Project Configuration`, `Showcase Color Tools`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `Showcase Color Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._