# Graph Report - japanese-learning  (2026-10-30)

## Corpus Check
- 226 files · ~291,743 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 61 file(s) not represented in the graph (top: .csv 53, (none) 4, .css 2)

## Summary
- 3288 nodes · 4864 edges · 203 communities (174 shown, 29 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 323 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f0e7617`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- withAuthenticatedUser
- Button
- attempts.server.ts
- teacher-schema.ts
- client.tsx
- dropdown-menu.tsx
- components.json
- field.tsx
- package.json
- compilerOptions
- devDependencies
- import-form.tsx
- Implementation Plan
- dependencies
- scripts
- eslint.config.mjs
- Document File Icon
- Stylized Globe Icon
- Next.js Wordmark Logo
- White Vercel Triangle Logo
- Desktop Window Icon
- ShadcnInstaller
- scripts/core.py
- gray
- cip/core.py
- render
- slide_search_core.py
- Tailwind CSS Utility Reference
- pathlib
- validate_data.py
- Brand Guidelines v1.0
- json
- Design
- Canvas Design System
- spacing
- design_system.py
- re
- The Design System Page
- Form & Input Components
- Tailwind CSS Responsive Design
- csv
- Typography Specifications
- Logo Usage Rules
- Component Specifications
- html-token-validator.py
- shadcn/ui Accessibility Patterns
- dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`)
- answers.ts
- Asset Approval Checklist
- Logo AI Prompt Engineering
- test_core.py
- test_core_data_quality.py
- schema.ts
- Color Palette Management
- CIP Deliverable Guide
- States and Variants
- display-misc.md
- UI Styling Skill
- test_style_taxonomy.py
- Workflow
- Design System
- toolbar
- Tailwind CSS Customization
- test_design_system_mode.py
- generate-slide.py
- dialog
- Routing by Task Type
- Chat & Messaging
- shadcn/ui Theming & Customization
- TestTailwindConfigGenerator
- Asset Organization Guide
- Primary Color Meanings
- Core Logo Types
- color
- test_relevance_evaluator.py
- Brand Consistency Checklist
- CIP Mockup Prompt Engineering
- Color Semantics
- Per-component notes
- DesignSystemGenerator
- Design Principles
- Design Principles
- fontSize
- TestReasoningContract
- progress/route.ts
- request
- extract-colors.cjs
- CIP Design Reference
- Icon Design Reference
- Copywriting Formulas
- Copywriting Formulas
- CatalogRefreshTest
- Banner Design - Multi-Format Creative Banner System
- Messaging Framework
- Brand Voice Framework
- validate-asset.cjs
- Layout Patterns
- Tailwind Integration
- Customization & Theming
- Layout Patterns
- TailwindConfigGenerator
- TestWebStackFreshness
- update.md
- Logo Design Reference
- Token Architecture
- design-tokens-starter.json
- navigation-menu (Radix `NavigationMenu` → Base UI `NavigationMenu`)
- Design Systems from DESIGN.md
- Styling & Customization
- .test_node_check_parses_generated_config
- TestDomainDetection
- TestSearchDomains
- read_rows
- report.tsx
- render-html.py
- Primitive Tokens
- embed-tokens.cjs
- validate-tokens.cjs
- card
- form
- alert-dialog
- Commands
- Tools
- Component Composition
- Core Visual Elements
- inject-brand-context.cjs
- CIP Design Style Guide
- primitive
- toast
- lists.tsx
- popover
- shadcn/ui
- parse_decision_rules
- TestNativeDesktopStackFreshness
- Quick Reference
- sync-brand-to-tokens.cjs
- Brand
- Slide Strategies
- Component Tokens
- generate-tokens.cjs
- button
- tooltip
- Target wrapper shapes (golden-derived specifics)
- Slide Strategies
- scroll-area
- Registry Authoring and Addresses
- input
- radius
- accordion
- tabs
- Step 4: Map Tokens to the Theme
- Base vs Radix
- ._apply_reasoning
- ui-ux-pro-max
- app/layout.tsx
- Slides Reference
- HTML Slide Template
- Class-string rewrites (layer 2)
- collapsible
- context-menu (Radix `ContextMenu` → Base UI `ContextMenu`)
- Radix UI -> Base UI migration
- Universal patterns (apply across all components)
- HTML Slide Template
- _filter_anti_patterns_for_mode
- Query Contract
- shadow
- Consumer-side prop changes (call sites, not wrappers)
- Slides
- split_values
- Pre-Delivery Checklist
- Prerequisites
- Brand Guidelines Template
- $type
- radius
- lg
- shadcn CLI Reference
- Icons
- Common Rules for Professional UI
- Example Workflow
- padding-y
- xl
- md
- none
- Tips for Better Results
- destructive
- destructive-foreground
- muted
- primary-foreground
- ring
- secondary-foreground
- slides-create.md
- create.md
- packs/route.ts

## God Nodes (most connected - your core abstractions)
1. `render()` - 135 edges
2. `TailwindConfigGenerator` - 58 edges
3. `TestTailwindConfigGenerator` - 35 edges
4. `DesignSystemGenerator` - 35 edges
5. `ShadcnInstaller` - 34 edges
6. `Button()` - 30 edges
7. `TestShadcnInstaller` - 26 edges
8. `withAuthenticatedUser()` - 24 edges
9. `apiJson()` - 23 edges
10. `apiError()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Known traps` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/design-system.md → src/components/ui/button.tsx
- `Step 5: Map Component Recipes to Variants` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/design-system.md → src/components/ui/button.tsx
- `Buttons inside inputs use InputGroup + InputGroupAddon` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/forms.md → src/components/ui/button.tsx
- `Icons → [icons.md](./rules/icons.md)` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → src/components/ui/button.tsx
- `Interaction (App)` --references--> `Button()`  [INFERRED]
  .agents/skills/ui-ux-pro-max/SKILL.md → src/components/ui/button.tsx

## Import Cycles
- None detected.

## Communities (203 total, 29 thin omitted)

### Community 0 - "withAuthenticatedUser"
Cohesion: 0.10
Nodes (46): DELETE, GET, PATCH, POST(), PUT, Context, DELETE, GET() (+38 more)

### Community 1 - "Button"
Cohesion: 0.18
Nodes (11): nextConfig, next, LearnerLayout(), metadata, RootLayout(), SignInPage(), AuthBoundary(), SignInForm() (+3 more)

### Community 2 - "attempts.server.ts"
Cohesion: 0.18
Nodes (23): firebase-admin, server-only, zod, cursorSchema, getPack(), importPack(), learnerPack(), validateAnswers() (+15 more)

### Community 3 - "teacher-schema.ts"
Cohesion: 0.07
Nodes (20): components, missing, source, [uiArg, ...roots], uiDir, walk(), @firebase/rules-unit-testing, @playwright/test (+12 more)

### Community 4 - "client.tsx"
Cohesion: 0.12
Nodes (23): Select.Root → Select.Root, firebase, react-dom, AuthContext, AuthProvider(), AuthState, getFirebaseAuth(), initializeAuth() (+15 more)

### Community 5 - "dropdown-menu.tsx"
Cohesion: 0.10
Nodes (22): Composition: asChild (radix) vs render (base), Assistant activity uses Trace, Items always inside their Group component, Component Selection, Component Structure → [composition.md](./rules/composition.md), lucide-react, next-themes, react (+14 more)

### Community 6 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 7 - "field.tsx"
Cohesion: 0.11
Nodes (20): Part-rename quick reference, Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea (+12 more)

### Community 8 - "package.json"
Cohesion: 0.11
Nodes (18): engines, node, name, overrides, @grpc/grpc-js, private, version, babel-plugin-react-compiler (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, @firebase/rules-unit-testing, firebase-tools, @playwright/test, prettier (+8 more)

### Community 11 - "import-form.tsx"
Cohesion: 0.13
Nodes (13): ImportPage(), instant, ImportForm(), clear(), confirm(), preview(), canonicalJson(), validatePack() (+5 more)

### Community 12 - "Implementation Plan"
Cohesion: 0.22
Nodes (15): Project Instructions, Application Architecture, Authentication and Data Flow, Firestore Model, Server-side Grading, Content Contract, Authoritative Grading Rules, Implementation Plan (+7 more)

### Community 13 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, @base-ui/react, class-variance-authority, cn, firebase, firebase-admin, lucide-react, next (+6 more)

### Community 14 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, dev, emulators, format, format:check, lint, start (+7 more)

### Community 15 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 22 - "ShadcnInstaller"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 23 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 24 - "gray"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 25 - "cip/core.py"
Cohesion: 0.06
Nodes (13): BM25, detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv(), BM25 (+5 more)

### Community 26 - "render"
Cohesion: 0.07
Nodes (44): Base UI only props worth knowing (checkbox), Base UI only props worth knowing (radio-group), Base UI only props worth knowing (select), Base UI only props worth knowing (slider), Base UI only props worth knowing (switch), checkbox, Checkbox.Indicator → Checkbox.Indicator, Checkbox.Root → Checkbox.Root (+36 more)

### Community 27 - "slide_search_core.py"
Cohesion: 0.08
Nodes (17): format_context(), format_result(), main(), BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion() (+9 more)

### Community 28 - "Tailwind CSS Utility Reference"
Cohesion: 0.05
Nodes (43): Arbitrary Values, Aspect Ratio, Background Colors, Border Color, Border Radius, Border Style, Border Width, Borders (+35 more)

### Community 29 - "pathlib"
Cohesion: 0.09
Nodes (5): test_sync_parses_bundled_starter_template(), main(), _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 30 - "validate_data.py"
Cohesion: 0.11
Nodes (31): _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract(), _check_file() (+23 more)

### Community 31 - "Brand Guidelines v1.0"
Cohesion: 0.05
Nodes (37): 1. Color Palette, 2. Typography, 3. Logo Usage, 4. Voice & Tone, 5. Imagery Guidelines, 6. Design Components, Accessibility, AI Image Generation (+29 more)

### Community 32 - "json"
Cohesion: 0.08
Nodes (14): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main(), format_brief() (+6 more)

### Community 33 - "Design"
Cohesion: 0.06
Nodes (35): Banner Design (Built-in), Banner: Design Rules, Banner: Quick Size Reference, Banner: Top Art Styles, Banner: Workflow, CIP Design (Built-in), CIP: Generate Brief, CIP: Generate Mockups (+27 more)

### Community 34 - "Canvas Design System"
Cohesion: 0.06
Nodes (35): 1. Visual Communication First, 2. Minimal Text Integration, 3. Expert Craftsmanship, 4. Systematic Patterns, Analog Meditation, Approach, Canvas Boundaries, Canvas Design System (+27 more)

### Community 35 - "spacing"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 36 - "design_system.py"
Cohesion: 0.08
Nodes (12): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_master_md(), format_page_override_md(), _generate_intelligent_overrides(), hex_to_ansi(), persist_design_system() (+4 more)

### Community 37 - "re"
Cohesion: 0.11
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 38 - "The Design System Page"
Cohesion: 0.08
Nodes (29): ColorPair(), contrast(), luminance(), toHex(), toRgb(), defaultStates, previewState(), StateMatrix() (+21 more)

### Community 39 - "Form & Input Components"
Cohesion: 0.06
Nodes (32): Accordion, Alert, Alert Dialog, Avatar, Badge, Button, Card, Checkbox (+24 more)

### Community 40 - "Tailwind CSS Responsive Design"
Cohesion: 0.06
Nodes (32): 1. Mobile-First Design, 2. Consistent Breakpoint Usage, 3. Test at Breakpoint Boundaries, 4. Use Container for Content Width, 5. Progressive Enhancement, 6. Avoid Too Many Breakpoints, Best Practices, Breakpoint System (+24 more)

### Community 41 - "csv"
Cohesion: 0.09
Nodes (12): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+4 more)

### Community 42 - "Typography Specifications"
Cohesion: 0.06
Nodes (30): Accessibility, Base System, Best Practices, Clean & Modern, Common Font Pairings, Contrast Requirements, CSS Implementation, Editorial (+22 more)

### Community 43 - "Logo Usage Rules"
Cohesion: 0.07
Nodes (28): Absolute Don'ts, Approved Backgrounds, Before Using Logo, Clear Space, Co-branding, Color Rules, Color Usage, Color Variants (+20 more)

### Community 44 - "Component Specifications"
Cohesion: 0.07
Nodes (28): Alert, Anatomy, Anatomy, Anatomy, Anatomy, Anatomy, Badge, Button (+20 more)

### Community 45 - "html-token-validator.py"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 46 - "shadcn/ui Accessibility Patterns"
Cohesion: 0.07
Nodes (28): Accordion, Alert, ARIA Labels, Checkbox and Radio, Color Contrast, Command Palette Navigation, Component-Specific Patterns, Dialog/Modal Navigation (+20 more)

### Community 47 - "dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`)"
Cohesion: 0.07
Nodes (27): Arrow → Menu.Arrow, Base UI only props worth knowing (Menu), CheckboxItem → Menu.CheckboxItem, Content → Menu.Portal > Menu.Positioner > Menu.Popup, CSS variable mapping (per menu flavor: `dropdown-menu` / `context-menu` / `menubar`), Data-attribute mapping (dropdown/context/menubar menus), Data attributes / CSS variables, dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`) (+19 more)

### Community 48 - "answers.ts"
Cohesion: 0.17
Nodes (15): LearningPack, Answers, answerSchema, matchesAccepted(), Ratings, Exercise, Grade, gradeAnswers() (+7 more)

### Community 49 - "Asset Approval Checklist"
Cohesion: 0.08
Nodes (25): Accessibility, Archival, Asset Approval Checklist, Automation Support, Color Compliance, Common Issues & Fixes, Content Accessibility, Content Quality (+17 more)

### Community 50 - "Logo AI Prompt Engineering"
Cohesion: 0.08
Nodes (25): Common Pitfalls, Core Prompt Structure, Detailed Brief, Eco/Sustainable, Effective Keywords by Style, Fashion Brand, Healthcare, Industry-Specific Prompts (+17 more)

### Community 51 - "test_core.py"
Cohesion: 0.08
Nodes (6): format_markdown(), generate_design_system(), TestBm25CoreBehavior, TestDiagnosticsContracts, TestPersistence, TestTokenizer

### Community 52 - "test_core_data_quality.py"
Cohesion: 0.13
Nodes (12): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _check_typography_contract(), _configured_font_names(), contrast_ratio() (+4 more)

### Community 53 - "schema.ts"
Cohesion: 0.11
Nodes (20): DELETE, GET, PATCH, PUT, accepted, base, choice, distinct() (+12 more)

### Community 54 - "Color Palette Management"
Cohesion: 0.08
Nodes (24): Accessibility Requirements, Brand Compliance Validation, Checking Contrast, Color Documentation Format, Color Extraction, Color Palette Examples, Color Palette Management, Color System Structure (+16 more)

### Community 55 - "CIP Deliverable Guide"
Cohesion: 0.08
Nodes (24): Apparel, Business Card, Car/Sedan, CIP Deliverable Guide, Core Identity, Digital Assets, Email Signature, Envelope (+16 more)

### Community 56 - "States and Variants"
Cohesion: 0.08
Nodes (24): Accessibility, Accessibility Requirements, ARIA States, Color Contrast, Color Variants, Disabled States, Error Messages, Error States (+16 more)

### Community 57 - "display-misc.md"
Cohesion: 0.08
Nodes (24): AccessibleIcon (radix `AccessibleIcon.Root`: `label` required), AspectRatio (radix `AspectRatio.Root`: `asChild`, `ratio` default `1`), avatar, Avatar.Fallback → Avatar.Fallback, Avatar.Image → Avatar.Image, Avatar.Root → Avatar.Root, Base UI only props worth knowing, Base UI only props worth knowing (+16 more)

### Community 58 - "UI Styling Skill"
Cohesion: 0.08
Nodes (24): Accessibility Patterns, Alternative: Tailwind-Only Setup, Best Practices, Common Patterns, Component Layer: shadcn/ui, Component Library Guide, Component + Styling Setup, Core Stack (+16 more)

### Community 59 - "test_style_taxonomy.py"
Cohesion: 0.10
Nodes (6): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution, read_rows(), TestStyleTaxonomy

### Community 60 - "Workflow"
Cohesion: 0.08
Nodes (23): Art Direction Styles (Reuse from Banner), Color & Contrast, Design Best Practices, HTML Design Rules, HTML Template Structure, Option A: Chrome Headless CLI (Recommended — zero dependencies), Option B: chrome-devtools skill, Option C: Playwright script (+15 more)

### Community 61 - "Design System"
Cohesion: 0.09
Nodes (22): Best Practices, Chart.js Integration, Command, Component Spec Pattern, Contextual Decision Flow, Decision System CSVs, Design System, Integration (+14 more)

### Community 62 - "toolbar"
Cohesion: 0.09
Nodes (22): Base UI only props worth knowing, Base UI only props worth knowing, Base UI only props worth knowing, CSS var mapping, CSS var mapping, CSS var mapping, Data-attribute mapping, Data-attribute mapping (+14 more)

### Community 63 - "Tailwind CSS Customization"
Cohesion: 0.09
Nodes (22): @apply Directive, Best Practices, Color Customization, Complete Tailwind Config, Configuration Examples, Content Configuration, Custom Color Palette, Custom Font Sizes (+14 more)

### Community 64 - "test_design_system_mode.py"
Cohesion: 0.15
Nodes (7): _contrast_ratio(), _derive_dark_palette(), _palette_is_dark(), _relative_luminance(), _select_palette_for_mode(), TestLuminance, TestPaletteSelection

### Community 65 - "generate-slide.py"
Cohesion: 0.13
Nodes (10): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+2 more)

### Community 66 - "dialog"
Cohesion: 0.10
Nodes (20): Arrow → Arrow, Base UI only props worth knowing (dialog), Base UI only props worth knowing (preview-card), Content → Popup, Content → Positioner + Popup, CSS variables (dialog), CSS variables (preview-card), Data attributes (dialog) (+12 more)

### Community 67 - "Routing by Task Type"
Cohesion: 0.10
Nodes (19): Banner Design Tasks, Brand Identity Tasks, Component Creation, Corporate Identity Program Tasks, Design Routing Guide, Design System Migration, Icon Design Tasks, Implementation Tasks (+11 more)

### Community 68 - "Chat & Messaging"
Cohesion: 0.11
Nodes (20): Data-attribute mapping, Attachments use Attachment, Chat & Messaging, Code and tool output use CodeBlock, Contents, Escape hatch: the scroller hooks, Message rows use Message, Message surfaces use Bubble (+12 more)

### Community 69 - "shadcn/ui Theming & Customization"
Cohesion: 0.10
Nodes (19): Base Color Presets, Best Practices, Color Customization, Color Format, Component Customization, CSS Variable System, Customize Styles, Customize Variants (+11 more)

### Community 71 - "Asset Organization Guide"
Cohesion: 0.11
Nodes (18): Asset Entry (manifest.json), Asset Organization Guide, By Campaign, By Status, By Type, Cleanup Workflow, Components, Directory Structure (+10 more)

### Community 72 - "Primary Color Meanings"
Cohesion: 0.11
Nodes (18): Accessibility Considerations, Analogous, Black, Blue, Color Combinations by Industry, Color Harmony Types, Complementary, Green (+10 more)

### Community 73 - "Core Logo Types"
Cohesion: 0.11
Nodes (18): 1. Wordmark (Logotype), 2. Lettermark (Monogram), 3. Pictorial Mark (Brand Mark), 4. Abstract Mark, 5. Mascot, 6. Emblem, 7. Combination Mark, Aesthetic Styles (+10 more)

### Community 74 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 75 - "test_relevance_evaluator.py"
Cohesion: 0.12
Nodes (3): TestFixtureValidation, TestMetricMath, TestThresholdGate

### Community 76 - "Brand Consistency Checklist"
Cohesion: 0.11
Nodes (17): Audit Frequency, Brand Consistency Checklist, Channel Audit, Collateral, Colors, Common Issues, Email, Imagery (+9 more)

### Community 77 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 78 - "Color Semantics"
Cohesion: 0.11
Nodes (17): Accent, Applying Semantic Tokens, Background & Foreground, Border & Ring, Color Semantics, Dark Mode Overrides, Destructive, Interactive States (+9 more)

### Community 79 - "Per-component notes"
Cohesion: 0.12
Nodes (16): accordion, breadcrumb / marker (Slot users), Coverage matrix, dialog / alert-dialog / sheet, Doc-validation TODOs (before specs are final), drawer (vaul -> Base UI) — OPT-IN ONLY, not part of a radix migration, form controls, menus (dropdown-menu -> Menu; context-menu; menubar) (+8 more)

### Community 81 - "Design Principles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 82 - "Design Principles"
Cohesion: 0.12
Nodes (15): 22 Art Direction Styles, Banner Sizes & Art Direction Styles Reference, Complete Banner Sizes, CTA Rules, Design Principles, Pinterest Research Queries, Print, Print Specs (+7 more)

### Community 83 - "fontSize"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 86 - "progress/route.ts"
Cohesion: 0.20
Nodes (12): DELETE, GET(), PATCH, POST, PUT, completedWindow(), CompletedAttempt, count() (+4 more)

### Community 87 - "request"
Cohesion: 0.22
Nodes (14): AttemptPage(), instant, instant, PackPracticePage(), request(), Review(), assess(), equal() (+6 more)

### Community 88 - "extract-colors.cjs"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 89 - "CIP Design Reference"
Cohesion: 0.13
Nodes (14): CIP Brief (Start Here), CIP Design Reference, Commands, Deliverable Categories, Design Styles, Detailed References, Generate Mockups, HTML Presentation Features (+6 more)

### Community 90 - "Icon Design Reference"
Cohesion: 0.13
Nodes (14): Available Styles, CLI Options, Commands, Generate Batch Variations, Generate Multiple Sizes, Generate Single Icon, Icon Categories, Icon Design Reference (+6 more)

### Community 91 - "Copywriting Formulas"
Cohesion: 0.13
Nodes (14): AIDA (Attention-Interest-Desire-Action), Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Core Formulas, Cost of Inaction, FAB (Features-Advantages-Benefits), Formula-to-Slide Mapping (+6 more)

### Community 92 - "Copywriting Formulas"
Cohesion: 0.13
Nodes (14): AIDA (Attention-Interest-Desire-Action), Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Core Formulas, Cost of Inaction, FAB (Features-Advantages-Benefits), Formula-to-Slide Mapping (+6 more)

### Community 94 - "Banner Design - Multi-Format Creative Banner System"
Cohesion: 0.14
Nodes (13): Art Direction Styles (Top 10), Banner Design - Multi-Format Creative Banner System, Banner Size Quick Reference, Design Rules, Prerequisites, Security, Step 1: Gather Requirements (AskUserQuestion), Step 2: Research & Art Direction (+5 more)

### Community 95 - "Messaging Framework"
Cohesion: 0.14
Nodes (13): Core Statements, Elevator Pitches, Framework Structure, Message Architecture, Message by Audience, Message Testing, Messaging Framework, Mission Statement (+5 more)

### Community 96 - "Brand Voice Framework"
Cohesion: 0.14
Nodes (13): Brand Voice Framework, Character Spectrum, Emotion Spectrum, Language Spectrum, Step 1: Define Personality Traits, Step 2: Create Voice Chart, Step 3: Context Adaptation, Tone Spectrum (+5 more)

### Community 97 - "validate-asset.cjs"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 98 - "Layout Patterns"
Cohesion: 0.14
Nodes (13): Card Styles, Component Variants, CSS Structures, Feature Grid (3 columns), Layout Decision Flow, Layout Patterns, Layout Selection by Use Case, Metric Styles (+5 more)

### Community 99 - "Tailwind Integration"
Cohesion: 0.14
Nodes (13): Animation Tokens, Base Layer, Button Example, Component Classes, CSS Variables Setup, Dark Mode Toggle, HSL Format Benefits, shadcn/ui Alignment (+5 more)

### Community 100 - "Customization & Theming"
Cohesion: 0.14
Nodes (14): 1. Built-in variants, 2. Tailwind classes via `className`, 3. Add a new variant, 4. Wrapper components, Adding Custom Colors, Border Radius, Changing the Theme, Checking for Updates (+6 more)

### Community 101 - "Layout Patterns"
Cohesion: 0.14
Nodes (13): Card Styles, Component Variants, CSS Structures, Feature Grid (3 columns), Layout Decision Flow, Layout Patterns, Layout Selection by Use Case, Metric Styles (+5 more)

### Community 104 - "update.md"
Cohesion: 0.15
Nodes (12): Color Presets, Examples, Files Modified, Important, Overview, Skills Used, Step 1: Gather Brand Input, Step 2: Update Brand Guidelines (+4 more)

### Community 105 - "Logo Design Reference"
Cohesion: 0.15
Nodes (12): Available Styles, Color Psychology, Commands, Design Brief (Start Here), Detailed References, Generate Logo, Industry Defaults, Logo Design Reference (+4 more)

### Community 106 - "Token Architecture"
Cohesion: 0.15
Nodes (12): Categories, Dark Mode, File Organization, Layer 1: Primitive Tokens, Layer 2: Semantic Tokens, Layer 3: Component Tokens, Layer Overview, Migration from Flat Tokens (+4 more)

### Community 107 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 108 - "navigation-menu (Radix `NavigationMenu` → Base UI `NavigationMenu`)"
Cohesion: 0.15
Nodes (13): Base UI only props worth knowing (NavigationMenu), Content → NavigationMenu.Content, CSS variable mapping (navigation-menu), Data-attribute mapping (navigation-menu), Gaps / caveats, Indicator → NavigationMenu.Icon (per wrapper ground truth), Item → NavigationMenu.Item, Link → NavigationMenu.Link (+5 more)

### Community 109 - "Design Systems from DESIGN.md"
Cohesion: 0.15
Nodes (13): Contents, Coverage check, Design Systems from DESIGN.md, Inputs to Confirm, Known traps, Picking a style, Report Back, Step 1: Scaffold (+5 more)

### Community 110 - "Styling & Customization"
Cohesion: 0.15
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 114 - "read_rows"
Cohesion: 0.23
Nodes (3): read_rows(), TestGeneratedCatalogContract, TestLandingAndStackContract

### Community 115 - "report.tsx"
Cohesion: 0.21
Nodes (8): instant, ProgressPage(), instant, TeacherReportPage(), Context, Report(), load(), progressSchema

### Community 116 - "render-html.py"
Cohesion: 0.23
Nodes (4): generate_html(), get_deliverable_info(), get_image_base64(), main()

### Community 117 - "Primitive Tokens"
Cohesion: 0.17
Nodes (11): Border Radius, Color Scales, Gray Scale, Motion / Duration, Primary Colors (Blue), Primitive Tokens, Shadows, Spacing Scale (+3 more)

### Community 118 - "embed-tokens.cjs"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 119 - "validate-tokens.cjs"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 120 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 121 - "form"
Cohesion: 0.17
Nodes (12): Base UI only props worth knowing (form-wide), CSS variables, Data attributes, form, Form.Control → Field.Control, Form.Field → Field.Root, Form.Label → Field.Label, Form.Message → Field.Error (+4 more)

### Community 122 - "alert-dialog"
Cohesion: 0.17
Nodes (12): Action → (no primitive), alert-dialog, Base UI only props worth knowing (alert-dialog), Cancel → Close, Content → Popup, CSS variables (alert-dialog), Data attributes (alert-dialog), Overlay → Backdrop (+4 more)

### Community 123 - "Commands"
Cohesion: 0.17
Nodes (12): `add` — Add components, `apply` — Apply a preset to an existing project, `build` — Build a custom registry, Commands, `diff` — Check for updates, `docs` — Get component documentation URLs, Dry-Run Mode, `info` — Project information (+4 more)

### Community 124 - "Tools"
Cohesion: 0.17
Nodes (11): Configuring Registries, Setup, `shadcn:get_add_command_for_items`, `shadcn:get_audit_checklist`, `shadcn:get_item_examples_from_registries`, `shadcn:get_project_registries`, `shadcn:list_items_in_registries`, shadcn MCP Server (+3 more)

### Community 125 - "Component Composition"
Cohesion: 0.17
Nodes (12): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+4 more)

### Community 126 - "Core Visual Elements"
Cohesion: 0.18
Nodes (10): Color Palette, Colors, Core Visual Elements, Logo, Logo, Quick Checks, Typography, Typography (+2 more)

### Community 127 - "inject-brand-context.cjs"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 128 - "CIP Design Style Guide"
Cohesion: 0.18
Nodes (10): Bold Dynamic, CIP Design Style Guide, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 129 - "primitive"
Cohesion: 0.18
Nodes (11): fast, normal, slow, $type, $value, $type, $value, primitive (+3 more)

### Community 130 - "toast"
Cohesion: 0.18
Nodes (11): Base UI only props worth knowing, CSS variables, Data attributes, toast, Toast.Action → Toast.Action, Toast.Close → Toast.Close, Toast.Description → Toast.Description, Toast.Provider → Toast.Provider (+3 more)

### Community 131 - "lists.tsx"
Cohesion: 0.29
Nodes (8): Sub → nested NavigationMenu.Root, HistoryPage(), instant, instant, PracticePage(), HistoryList(), List(), PracticeList()

### Community 132 - "popover"
Cohesion: 0.18
Nodes (11): Anchor → Positioner `anchor` prop, Arrow → Arrow, Base UI only props worth knowing (popover), Close → Close, Content → Positioner + Popup, CSS variables (popover), Data attributes (popover), popover (+3 more)

### Community 134 - "shadcn/ui"
Cohesion: 0.18
Nodes (11): Component Docs, Examples, and Usage, Current Project Context, Design Systems from DESIGN.md, Detailed References, Key Fields, Key Patterns, Principles, Quick Reference (+3 more)

### Community 135 - "parse_decision_rules"
Cohesion: 0.24
Nodes (4): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action()

### Community 137 - "Quick Reference"
Cohesion: 0.18
Nodes (11): 10. Charts & Data (LOW), 1. Accessibility (CRITICAL), 2. Touch & Interaction (CRITICAL), 3. Performance (HIGH), 4. Style Selection (HIGH), 5. Layout & Responsive (HIGH), 6. Typography & Color (MEDIUM), 7. Animation (MEDIUM) (+3 more)

### Community 138 - "sync-brand-to-tokens.cjs"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 139 - "Brand"
Cohesion: 0.20
Nodes (9): Brand, Brand Sync Workflow, Quick Start, References, Routing, Scripts, Subcommands, Templates (+1 more)

### Community 140 - "Slide Strategies"
Cohesion: 0.20
Nodes (9): Common Structures, Duarte Sparkline Pattern, Matching Strategy to Context, Product Demo (6 slides), Sales Pitch (9 slides), Search Commands, Slide Strategies, Strategy Selection (+1 more)

### Community 141 - "Component Tokens"
Cohesion: 0.20
Nodes (9): Alert Tokens, Badge Tokens, Button Tokens, Card Tokens, Component Tokens, Dialog/Modal Tokens, Input Tokens, Table Tokens (+1 more)

### Community 142 - "generate-tokens.cjs"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 143 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 144 - "tooltip"
Cohesion: 0.20
Nodes (10): Arrow → Arrow, Base UI only props worth knowing (tooltip), Content → Positioner + Popup, CSS variables (tooltip), Data attributes (tooltip), Portal → Portal, Provider → Provider, Root → Root (+2 more)

### Community 145 - "Target wrapper shapes (golden-derived specifics)"
Cohesion: 0.20
Nodes (9): Accordion animation placement, Button, Conventions, DropdownMenu / ContextMenu SubContent, Select, SubTrigger open styling, Tabs, Target wrapper shapes (golden-derived specifics) (+1 more)

### Community 146 - "Slide Strategies"
Cohesion: 0.20
Nodes (9): Common Structures, Duarte Sparkline Pattern, Matching Strategy to Context, Product Demo (6 slides), Sales Pitch (9 slides), Search Commands, Slide Strategies, Strategy Selection (+1 more)

### Community 149 - "scroll-area"
Cohesion: 0.22
Nodes (9): Base UI only props worth knowing, CSS variables, Data attributes, scroll-area, ScrollArea.Corner → ScrollArea.Corner, ScrollArea.Root → ScrollArea.Root, ScrollArea.Viewport → ScrollArea.Viewport, ScrollAreaScrollbar → ScrollArea.Scrollbar (+1 more)

### Community 150 - "Registry Authoring and Addresses"
Cohesion: 0.22
Nodes (9): Address Schemes, Build and Verify, GitHub Registries, Include, Item Definitions, Mental Model, Registry Authoring and Addresses, Registry Dependencies (+1 more)

### Community 151 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 152 - "radius"
Cohesion: 0.29
Nodes (8): $type, $value, $type, $value, radius, default, full, default

### Community 153 - "accordion"
Cohesion: 0.25
Nodes (8): accordion, Accordion.Content → Accordion.Panel, Accordion.Header → Accordion.Header, Accordion.Item → Accordion.Item, Accordion.Root → Accordion.Root, Accordion.Trigger → Accordion.Trigger, Base UI only props worth knowing, CSS var mapping

### Community 154 - "tabs"
Cohesion: 0.25
Nodes (8): Base UI only props worth knowing, CSS var mapping, Data-attribute mapping, tabs, Tabs.Content → Tabs.Panel, Tabs.List → Tabs.List, Tabs.Root → Tabs.Root, Tabs.Trigger → Tabs.Tab

### Community 155 - "Step 4: Map Tokens to the Theme"
Cohesion: 0.25
Nodes (8): Dark mode, Elevation, Focus, Fonts, Radius, Role mapping, Step 4: Map Tokens to the Theme, Type scale

### Community 156 - "Base vs Radix"
Cohesion: 0.25
Nodes (8): Accordion, Base vs Radix, Button / trigger as non-button element (base only), Contents, Select, Select — multiple selection and object values (base only), Slider, ToggleGroup

### Community 161 - "ui-ux-pro-max"
Cohesion: 0.25
Nodes (7): How to Use, Primary Use Cases, Recommended, Rule Categories by Priority, Skip, ui-ux-pro-max, When to Apply

### Community 162 - "app/layout.tsx"
Cohesion: 0.29
Nodes (6): geistMono, geistSans, inter, metadata, RootLayout(), ThemeProvider()

### Community 163 - "Slides Reference"
Cohesion: 0.29
Nodes (6): Key Features, Knowledge Base, Slides Reference, Usage, When to Use, Workflow

### Community 164 - "HTML Slide Template"
Cohesion: 0.29
Nodes (6): Animation Classes, Background Images, Base Structure, Chart.js Integration, CSS Variables Reference, HTML Slide Template

### Community 165 - "Class-string rewrites (layer 2)"
Cohesion: 0.29
Nodes (6): Animation idiom, Class-string rewrites (layer 2), CSS variables, Data-attribute selectors, Disabled-state hooks, Element changes kill pseudo-class variants

### Community 166 - "collapsible"
Cohesion: 0.29
Nodes (7): Base UI only props worth knowing, collapsible, Collapsible.Content → Collapsible.Panel, Collapsible.Root → Collapsible.Root, Collapsible.Trigger → Collapsible.Trigger, CSS var mapping, Data-attribute mapping

### Community 167 - "context-menu (Radix `ContextMenu` → Base UI `ContextMenu`)"
Cohesion: 0.29
Nodes (7): Arrow / Item / Group / Label / CheckboxItem / RadioGroup / RadioItem / ItemIndicator / Separator / Sub / SubTrigger / SubContent, Base UI only, data attributes, CSS variables, Content → ContextMenu.Portal > Positioner > Popup, context-menu (Radix `ContextMenu` → Base UI `ContextMenu`), Portal → ContextMenu.Portal, Root → ContextMenu.Root, Trigger → ContextMenu.Trigger

### Community 168 - "Radix UI -> Base UI migration"
Cohesion: 0.29
Nodes (6): Hard rules, Modes, Preflight (always), Radix UI -> Base UI migration, Strategy: golden pair first, transformation engine second, Verify and report

### Community 169 - "Universal patterns (apply across all components)"
Cohesion: 0.29
Nodes (7): asChild -> render, CSS custom properties, Data attributes / class hooks, Imports, Portal / positioning model (biggest structural change), Props, Universal patterns (apply across all components)

### Community 170 - "HTML Slide Template"
Cohesion: 0.29
Nodes (6): Animation Classes, Background Images, Base Structure, Chart.js Integration, CSS Variables Reference, HTML Slide Template

### Community 173 - "Query Contract"
Cohesion: 0.29
Nodes (7): Query Contract, Step 1: Analyze User Requirements, Step 2: Generate Design System (new projects/pages), Step 2b: Persist Design System (Master + Overrides Pattern), Step 2c: Design Dials (optional), Step 3: Supplement with Detailed Searches (as needed), Step 4: Stack Guidelines

### Community 174 - "shadow"
Cohesion: 0.47
Nodes (6): sm, shadow, sm, sm, $type, $value

### Community 175 - "Consumer-side prop changes (call sites, not wrappers)"
Cohesion: 0.33
Nodes (5): Callback signature rule, Consumer-side prop changes (call sites, not wrappers), Per component, Sweep procedure, Universal

### Community 176 - "Slides"
Cohesion: 0.33
Nodes (5): References (Knowledge Base), Routing, Slides, Subcommands, When to Use

### Community 177 - "split_values"
Cohesion: 0.47
Nodes (3): split_values(), style_identities(), TestStyleIdentityContract

### Community 178 - "Pre-Delivery Checklist"
Cohesion: 0.33
Nodes (6): Accessibility, Interaction, Layout, Light/Dark Mode, Pre-Delivery Checklist, Visual Quality

### Community 179 - "Prerequisites"
Cohesion: 0.33
Nodes (6): Available Domains, Available Stacks, How to Use This Skill, Output Formats, Prerequisites, Search Reference

### Community 180 - "Brand Guidelines Template"
Cohesion: 0.40
Nodes (4): Brand Guidelines Template, Document Structure, Extractable Fields, Usage

### Community 181 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 182 - "radius"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 183 - "lg"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 184 - "shadcn CLI Reference"
Cohesion: 0.40
Nodes (5): Contents, Presets, shadcn CLI Reference, Switching Presets, Templates

### Community 185 - "Icons"
Cohesion: 0.40
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 186 - "Common Rules for Professional UI"
Cohesion: 0.40
Nodes (5): Common Rules for Professional UI, Icons & Visual Elements, Interaction (App), Layout & Spacing, Light/Dark Mode Contrast

### Community 187 - "Example Workflow"
Cohesion: 0.40
Nodes (5): Example Workflow, Step 1: Analyze Requirements, Step 2: Generate Design System, Step 3: Supplement with Detailed Searches (as needed), Step 4: Stack Guidelines

### Community 188 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 189 - "xl"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 190 - "md"
Cohesion: 0.67
Nodes (4): $type, $value, md, md

### Community 191 - "none"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 193 - "Tips for Better Results"
Cohesion: 0.50
Nodes (4): Common Sticking Points, Pre-Delivery Checklist, Query Strategy, Tips for Better Results

### Community 194 - "destructive"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 195 - "destructive-foreground"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 196 - "muted"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 197 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 198 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 199 - "secondary-foreground"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

### Community 202 - "packs/route.ts"
Cohesion: 0.32
Nodes (7): DELETE, GET(), PATCH, POST, PUT, listPacks(), parseCursor()

## Knowledge Gaps
- **19 isolated node(s):** `tw-animate-css`, `@tailwindcss/turbopack`, `@types/node`, `@types/react`, `@types/react-dom` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1862 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `render()` connect `render` to `toast`, `popover`, `dropdown-menu.tsx`, `client.tsx`, `tooltip`, `Target wrapper shapes (golden-derived specifics)`, `scroll-area`, `accordion`, `tabs`, `Base vs Radix`, `collapsible`, `context-menu (Radix `ContextMenu` → Base UI `ContextMenu`)`, `Consumer-side prop changes (call sites, not wrappers)`, `dropdown-menu (Radix `DropdownMenu` → Base UI `Menu`)`, `display-misc.md`, `toolbar`, `dialog`, `Chat & Messaging`, `Per-component notes`, `navigation-menu (Radix `NavigationMenu` → Base UI `NavigationMenu`)`, `Design Systems from DESIGN.md`, `form`, `alert-dialog`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Are the 133 inferred relationships involving `render()` (e.g. with `Universal` and `Accordion.Content → Accordion.Panel`) actually correct?**
  _`render()` has 133 INFERRED edges - model-reasoned connections that need verification._
- **What connects `tw-animate-css`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `withAuthenticatedUser` be split into smaller, more focused modules?**
  _Cohesion score 0.0965166908563135 - nodes in this community are weakly interconnected._
- **Why does `validate()` connect `validate_data.py` to `form`, `re`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `teacher-schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07051282051282051 - nodes in this community are weakly interconnected._