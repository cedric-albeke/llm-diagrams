# Automated Architecture Diagram Generator (Excalidraw)

> **Repo Context**: This plan was developed while analyzing the foxpay codebase (`/home/zady/Development/foxpay-orgscan-integration`) and now lives in its own standalone repo at `/home/zady/Development/llm-diagrams`. References to foxpay files (e.g., `scripts/analyze-component-patterns.ts`, `scripts/component-dependency-graph.js`, `docs-maintenance.yml`, `vitest.config.ts`) are **pattern references** — they describe conventions to follow, not files that exist in this repo. The foxpay codebase (1,505 TS files) serves as the primary test target for the generated tool.

## TL;DR

> **Quick Summary**: Build a production-grade tool that analyzes any TypeScript codebase via static analysis (dependency-cruiser + ts-morph) + optional LLM reasoning (Anthropic API) + ELK.js layout, then renders architecture diagrams to Excalidraw canvas, .excalidraw JSON, Mermaid markdown, and SVG/PNG. Dual entry-point: interactive Claude Code orchestration (zero API keys) + headless npm script.
>
> **Deliverables**:
> - Core library: `scripts/archdiagram/` — 4-phase pipeline (analyze → reason → layout → render)
> - npm script: `npm run docs:diagram` — headless mode with static-only fallback
> - Claude Code skill: `.claude/skills/archdiagram-skill/SKILL.md` — interactive orchestration
> - Config system: `archdiagram.config.ts` with CLI overrides
> - 4 output formats: .excalidraw JSON, Mermaid .md, live Excalidraw canvas, SVG/PNG
> - Test suite: vitest unit + integration tests with fixtures
> - CI option: docs-maintenance.yml step for scheduled regeneration
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: Task 1 → Task 5/6 → Task 8 → Task 13 → Task 18 → Task 19 → F1-F4

---

## Context

### Original Request
Build the production-grade approach (#3 from research) for automated architecture diagram creation using Excalidraw — the hybrid pipeline: Static Analysis → LLM Reasoning → Layout Engine → Excalidraw Rendering.

### Interview Summary
**Key Discussions**:
- Target scope: any TypeScript project (not foxpay-specific), single tsconfig only for v1
- Invocation: dual entry-point — Claude Code interactive (primary, zero API keys) + npm script (headless, optional ANTHROPIC_API_KEY)
- LLM: Anthropic API for headless mode; Claude Code session IS the LLM for interactive mode
- Diagram levels: C4 L1-2 (System overview + Container) — L3 deferred to v2
- Output: all 4 formats (.excalidraw JSON, Mermaid .md, Excalidraw live canvas, SVG/PNG)
- Config: `archdiagram.config.ts` + CLI flag overrides
- Testing: vitest + agent-executed QA scenarios
- Generation: on-demand primary + CI option via docs-maintenance.yml

**Research Findings**:
- dependency-cruiser (987K weekly npm, 6.4K stars) — gold standard for JS/TS dep graphs; `tsPreCompilationDeps: true` required for path alias resolution
- ts-morph — TypeScript AST; use `skipFileDependencyResolution: true` + `skipLoadingLibFiles: true` to keep RAM <400MB
- ELK.js — import `elkjs/lib/elk.bundled.js` (NOT default export); layered algorithm best for architecture
- Two-agent LLM pattern (BlueLens/CodeBoarding proven): File Analyst → Architect; pre-cluster by directory (~15-20 calls vs ~150)
- 6-layer hallucination prevention from CodeBoarding: anchored references → name validation → relation validation → coverage validation → bidirectional coverage → retry loop
- Excalidraw MCP: batch_create_elements with custom IDs + startElementId/endElementId arrow binding; `export_scene` works without browser

### Metis Review
**Identified Gaps** (addressed):
- **CRITICAL**: MCP agents unavailable from npm scripts → solved with dual entry-point architecture
- Barrel exports create mega-hub distortion in dep-cruiser → post-process to inline edges
- ts-morph without optimization flags uses >600MB RAM → flags mandated
- ELK.js default export is web worker version → bundled import mandated
- LLM hallucination risk → 6-layer validation pipeline mandated
- SVG/PNG export requires browser → mmdc CLI for headless, MCP export_to_image when canvas available
- Monorepo/workspace handling → explicitly deferred to v2

---

## Work Objectives

### Core Objective
Build an automated architecture diagram generator that takes any TypeScript project's source code and produces publication-quality architecture diagrams in multiple formats, using a hybrid static-analysis + LLM pipeline.

### Concrete Deliverables
- `scripts/archdiagram/` — Core TypeScript library (pipeline phases, types, config, renderers)
- `scripts/generate-architecture-diagram.ts` — npm script entry point
- `.claude/skills/archdiagram-skill/SKILL.md` — Claude Code interactive skill
- `archdiagram.config.ts` — Type-safe project configuration (at project root)
- `tests/archdiagram/` — vitest unit + integration tests with fixtures
- `docs/architecture/` — Generated diagram output directory
- `assets/reports/` — Raw JSON graph data output

### Definition of Done
- [ ] `npx tsx scripts/generate-architecture-diagram.ts --mode static` produces valid .excalidraw JSON + Mermaid .md in `docs/architecture/` without any API key
- [ ] `ANTHROPIC_API_KEY=sk-... npx tsx scripts/generate-architecture-diagram.ts` produces LLM-enriched diagrams with semantic module grouping
- [ ] Claude Code interactive mode generates diagrams via MCP tools when canvas is running
- [ ] All vitest tests pass: `npx vitest run --reporter=verbose`
- [ ] Static-only mode completes in <30s on the foxpay codebase (1505 files)
- [ ] No node in generated diagrams maps to a non-existent file/directory

### Must Have
- Static analysis produces accurate import graph from any single-tsconfig TypeScript project
- Barrel export resolution (index.ts files don't appear as mega-hub nodes)
- ELK.js-computed layout with no overlapping elements
- .excalidraw JSON output that opens cleanly in excalidraw.com
- Valid Mermaid output that renders in GitHub/GitLab markdown
- Config file for project-specific customization (srcDir, excludes, style)
- Static-only mode works without any API key
- Hallucination prevention validates every LLM-suggested component against actual codebase

### Must NOT Have (Guardrails)
- No C4 Level 3 component-detail diagrams (deferred to v2)
- No monorepo/workspace/multi-tsconfig support (v2)
- No JavaScript-only project support (TypeScript only)
- No interactive diagram editing or manipulation
- No real-time file watching or hot-reload
- No diagram diffing between runs
- No plugin/extension architecture — hardcoded 4-phase pipeline
- No CLI framework (yargs, commander) — use minimist or process.argv parsing
- No incremental generation or caching layer
- No excessive JSDoc — let TypeScript types speak
- No `as any` or `@ts-ignore` — strict TypeScript throughout

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES — vitest ^4.1.0 configured, 13 existing test files, `@` alias works
- **Automated tests**: YES (TDD) — RED → GREEN → REFACTOR per task
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Pipeline phases**: Use Bash — run the script, parse JSON output, assert structure and values
- **File outputs**: Use Bash — check file existence, parse JSON/Mermaid, validate schema
- **Excalidraw MCP**: Use MCP tools — batch_create, describe_scene, get_canvas_screenshot
- **Config system**: Use Bash — run with different config/flags, assert correct behavior

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, 4 parallel tasks):
├── Task 1: Install deps + directory scaffolding [quick]
├── Task 2: Core TypeScript types/interfaces [quick]
├── Task 3: Config system (schema + loader + CLI merge) [quick]
├── Task 4: Test fixtures (small TS project + vitest helpers) [quick]

Wave 2 (After Wave 1 — static analysis backbone, 4 tasks):
├── Task 5: dependency-cruiser integration (depends: 2, 4) [deep]
├── Task 6: ts-morph symbol extraction (depends: 2, 4) [deep]
├── Task 7: Barrel export resolver (depends: 5) [unspecified-high]
├── Task 8: Unified graph builder (depends: 5, 6, 7) [unspecified-high]

Wave 3 (After Wave 2 — LLM + layout, 5 tasks):
├── Task 9: LLM prompt templates + structured schemas (depends: 2) [deep]
├── Task 10: Anthropic API adapter (depends: 2) [unspecified-high]
├── Task 11: Response validation + hallucination prevention (depends: 9) [deep]
├── Task 12: Directory pre-clustering + LLM orchestrator (depends: 9, 10, 11) [deep]
├── Task 13: ELK.js layout engine (depends: 8) [unspecified-high]

Wave 4 (After Wave 3 — rendering, 4 parallel tasks):
├── Task 14: Excalidraw JSON renderer (depends: 13) [unspecified-high]
├── Task 15: Mermaid markdown renderer (depends: 8) [quick]
├── Task 16: Excalidraw MCP canvas renderer (depends: 13) [unspecified-high]
├── Task 17: SVG/PNG export (depends: 14, 15) [quick]

Wave 5 (After Wave 4 — integration + entry points, 4 tasks):
├── Task 18: Pipeline orchestrator (depends: 8, 12, 13, 14-17) [deep]
├── Task 19: npm script entry point + package.json (depends: 3, 18) [quick]
├── Task 20: Claude Code skill instructions (depends: 18) [writing]
├── Task 21: CI integration in docs-maintenance.yml (depends: 19) [quick]

Wave FINAL (After ALL — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|---|---|---|---|
| 1 | — | 5, 6, 7, 8, 9, 10, 13 | 1 |
| 2 | — | 5, 6, 8, 9, 10, 13, 14-16 | 1 |
| 3 | — | 19 | 1 |
| 4 | — | 5, 6 | 1 |
| 5 | 2, 4 | 7, 8, 15 | 2 |
| 6 | 2, 4 | 8 | 2 |
| 7 | 5 | 8 | 2 |
| 8 | 5, 6, 7 | 12, 13, 15, 18 | 2 |
| 9 | 2 | 11, 12 | 3 |
| 10 | 2 | 12 | 3 |
| 11 | 9 | 12 | 3 |
| 12 | 9, 10, 11 | 18 | 3 |
| 13 | 8 | 14, 16, 18 | 3 |
| 14 | 13 | 17, 18 | 4 |
| 15 | 8 | 17, 18 | 4 |
| 16 | 13 | 18 | 4 |
| 17 | 14, 15 | 18 | 4 |
| 18 | 8, 12, 13, 14-17 | 19, 20, 21 | 5 |
| 19 | 3, 18 | 21, F1-F4 | 5 |
| 20 | 18 | F1-F4 | 5 |
| 21 | 19 | F1-F4 | 5 |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1-T4 → `quick`
- **Wave 2**: 4 tasks — T5 → `deep`, T6 → `deep`, T7 → `unspecified-high`, T8 → `unspecified-high`
- **Wave 3**: 5 tasks — T9 → `deep`, T10 → `unspecified-high`, T11 → `deep`, T12 → `deep`, T13 → `unspecified-high`
- **Wave 4**: 4 tasks — T14 → `unspecified-high`, T15 → `quick`, T16 → `unspecified-high`, T17 → `quick`
- **Wave 5**: 4 tasks — T18 → `deep`, T19 → `quick`, T20 → `writing`, T21 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

### Wave 1 — Foundation (Start Immediately, All Parallel)

- [x] 1. Install Dependencies + Directory Scaffolding

  **What to do**:
  - Install devDependencies: `dependency-cruiser`, `ts-morph`, `elkjs`, `@anthropic-ai/sdk`, `@mermaid-js/mermaid-cli`
  - Create directory structure:
    ```
    scripts/archdiagram/
    ├── types.ts          # Core interfaces
    ├── config.ts         # Config loader
    ├── phases/
    │   ├── analyze.ts    # Phase 1: Static analysis
    │   ├── reason.ts     # Phase 2: LLM reasoning
    │   ├── layout.ts     # Phase 3: ELK layout
    │   └── render.ts     # Phase 4: Rendering
    ├── renderers/
    │   ├── excalidraw.ts # .excalidraw JSON
    │   ├── mermaid.ts    # Mermaid .md
    │   ├── canvas.ts     # MCP live canvas
    │   └── image.ts      # SVG/PNG export
    ├── utils/
    │   ├── barrel-resolver.ts
    │   └── graph-utils.ts
    └── index.ts          # Pipeline orchestrator
    ```
  - Create `scripts/generate-architecture-diagram.ts` as entry point stub (just imports + `main()` skeleton)
  - Create `tests/archdiagram/` directory for tests
  - Ensure `docs/architecture/` and `assets/reports/` output directories exist

  **Must NOT do**:
  - Don't implement any logic yet — stubs only
  - Don't add to package.json scripts yet (Task 19)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6, 7, 8, 9, 10, 13
  - **Blocked By**: None

  **References**:
  - `package.json` — add devDependencies here
  - `scripts/analyze-component-patterns.ts` — follow this file's shebang/structure pattern (`#!/usr/bin/env tsx`)
  - `scripts/component-dependency-graph.js` — reference for existing graph analysis script structure

  **Acceptance Criteria**:
  - [ ] `npm ls dependency-cruiser ts-morph elkjs @anthropic-ai/sdk @mermaid-js/mermaid-cli` → all listed as devDependencies
  - [ ] `ls scripts/archdiagram/phases/` → analyze.ts, reason.ts, layout.ts, render.ts exist
  - [ ] `ls scripts/archdiagram/renderers/` → excalidraw.ts, mermaid.ts, canvas.ts, image.ts exist
  - [ ] `npx tsx scripts/generate-architecture-diagram.ts --help` → exits 0 with usage stub

  **QA Scenarios**:
  ```
  Scenario: All directories and stub files created
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. Run: find scripts/archdiagram -name "*.ts" | sort
      2. Assert output includes: types.ts, config.ts, index.ts, phases/analyze.ts, phases/reason.ts, phases/layout.ts, phases/render.ts, renderers/excalidraw.ts, renderers/mermaid.ts, renderers/canvas.ts, renderers/image.ts, utils/barrel-resolver.ts, utils/graph-utils.ts
      3. Run: npx tsx scripts/generate-architecture-diagram.ts --help
      4. Assert exit code 0
    Expected Result: 13+ .ts files in archdiagram/, entry point runs without error
    Evidence: .sisyphus/evidence/task-1-scaffolding.txt

  Scenario: Dependencies installed correctly
    Tool: Bash
    Steps:
      1. Run: node -e "require('dependency-cruiser'); require('ts-morph'); require('elkjs/lib/elk.bundled.js'); console.log('ALL OK')"
      2. Assert output contains "ALL OK"
    Expected Result: All dependencies importable
    Evidence: .sisyphus/evidence/task-1-deps.txt
  ```

  **Commit**: YES (groups with Tasks 2-4)
  - Message: `feat(archdiagram): add project scaffolding, types, config system, and test fixtures`
  - Pre-commit: `npx vitest run`

- [x] 2. Core TypeScript Types and Interfaces

  **What to do**:
  - Define all pipeline data types in `scripts/archdiagram/types.ts`:
    ```typescript
    // Phase 1 output
    interface ImportEdge { source: string; target: string; dependencyTypes: string[] }
    interface ImportGraph { modules: ModuleNode[]; edges: ImportEdge[] }
    interface ModuleNode { path: string; isBarrel: boolean; exports: ExportInfo[]; directives: ('use client' | 'use server')[] }
    interface ExportInfo { name: string; kind: 'function' | 'class' | 'type' | 'interface' | 'variable' | 'component' | 'hook' | 'context' }

    // Phase 2 output
    interface ModuleGroup { name: string; description: string; files: string[]; role: 'frontend' | 'backend' | 'shared' | 'external' }
    interface ModuleRelationship { from: string; to: string; label: string; style: 'sync' | 'async' | 'data' }
    interface ArchitectureGraph { groups: ModuleGroup[]; relationships: ModuleRelationship[]; c4Level: 1 | 2 }

    // Phase 3 output
    interface LayoutNode { id: string; x: number; y: number; width: number; height: number; label: string; group?: string; color?: string }
    interface LayoutEdge { id: string; sourceId: string; targetId: string; label?: string; bendPoints?: {x:number,y:number}[] }
    interface LayoutedDiagram { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number; zones: LayoutZone[] }
    interface LayoutZone { id: string; x: number; y: number; width: number; height: number; label: string; color: string }

    // Phase 4 input/output
    interface RenderOptions { format: ('excalidraw' | 'mermaid' | 'canvas' | 'svg' | 'png')[]; outputDir: string }
    interface RenderResult { format: string; filePath: string; success: boolean; error?: string }

    // Config
    interface ArchDiagramConfig { srcDir: string; tsConfigPath: string; exclude: string[]; outputDir: string; llm: LLMConfig; style: StyleConfig }
    interface LLMConfig { provider: 'anthropic' | 'none'; apiKey?: string; model?: string; temperature?: number }
    interface StyleConfig { direction: 'RIGHT' | 'DOWN'; colorScheme: Record<string, string>; fontSize: number }
    ```
  - Export all types, ensure strict TypeScript (no `any`)

  **Must NOT do**:
  - Don't implement any logic — types only
  - Don't add runtime dependencies — this file should have zero imports

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 6, 8, 9, 10, 13, 14-16
  - **Blocked By**: None

  **References**:
  - `src/types/` — follow project's TypeScript type conventions (PascalCase with descriptive names)
  - `scripts/archdiagram/types.ts` — this is the target file
  - ELK.js API: nodes require `id`, `width`, `height`; edges require `sources[]`, `targets[]`; layout returns `x`, `y` on each node
  - Excalidraw element types: `rectangle`, `arrow`, `text`, `ellipse`, `diamond`; arrows use `startElementId`/`endElementId`

  **Acceptance Criteria**:
  - [ ] `npx tsx -e "import * as t from './scripts/archdiagram/types'; console.log(Object.keys(t).length)"` → prints number > 0, exits 0
  - [ ] No `any` types in the file: `grep -c "any" scripts/archdiagram/types.ts` → 0 (or only in comments)

  **QA Scenarios**:
  ```
  Scenario: Types compile without error
    Tool: Bash
    Steps:
      1. Run: npx tsx -e "import type { ImportGraph, ArchitectureGraph, LayoutedDiagram, ArchDiagramConfig } from './scripts/archdiagram/types'; console.log('TYPES OK')"
      2. Assert output contains "TYPES OK"
      3. Run: grep -c "as any" scripts/archdiagram/types.ts
      4. Assert output is "0"
    Expected Result: All types importable, no 'as any' usage
    Evidence: .sisyphus/evidence/task-2-types.txt

  Scenario: No runtime imports in types file
    Tool: Bash
    Steps:
      1. Run: grep "^import " scripts/archdiagram/types.ts | grep -v "type " | wc -l
      2. Assert output is "0" (only type imports allowed)
    Expected Result: Pure type file with no runtime dependencies
    Evidence: .sisyphus/evidence/task-2-pure-types.txt
  ```

  **Commit**: YES (groups with Tasks 1, 3, 4)

- [x] 3. Config System (Schema + Loader + CLI Merge)

  **What to do**:
  - Implement `scripts/archdiagram/config.ts`:
    - `DEFAULT_CONFIG: ArchDiagramConfig` — sensible defaults (srcDir: "src", tsConfig: "tsconfig.json", exclude: ["node_modules", "**/*.test.*", "**/*.spec.*"], outputDir: "docs/architecture")
    - `loadConfigFile(path?: string): ArchDiagramConfig` — load `archdiagram.config.ts` from project root using dynamic `import()`, fall back to defaults if not found
    - `parseCliFlags(argv: string[]): Partial<ArchDiagramConfig>` — parse process.argv for `--mode`, `--src-dir`, `--output-dir`, `--exclude`, `--format`, `--llm-provider`, `--dry-run`, `--phase`, `--validate-only`, `--help`
    - `mergeConfig(file: ArchDiagramConfig, cli: Partial<ArchDiagramConfig>): ArchDiagramConfig` — CLI flags override file config
    - `validateConfig(config: ArchDiagramConfig): { valid: boolean; errors: string[] }` — check srcDir exists, tsconfig exists, outputDir writable
  - Write vitest tests in `tests/archdiagram/config.test.ts`:
    - Test default config has all required fields
    - Test CLI flag parsing for each supported flag
    - Test merge precedence (CLI overrides file)
    - Test validation catches missing srcDir

  **Must NOT do**:
  - Don't use yargs/commander — simple process.argv parsing
  - Don't read env vars for config (env vars are only for API keys)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 19
  - **Blocked By**: None

  **References**:
  - `scripts/archdiagram/types.ts:ArchDiagramConfig` — the config type definition
  - `tsconfig.json` — reference for default tsConfigPath value and path alias setup
  - `scripts/analyze-component-patterns.ts` — follow this script's argument parsing pattern

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/config.test.ts` → PASS (all tests green)
  - [ ] CLI `--help` flag prints usage and exits 0
  - [ ] Config validation catches non-existent srcDir

  **QA Scenarios**:
  ```
  Scenario: Default config loads when no config file exists
    Tool: Bash
    Preconditions: No archdiagram.config.ts at project root
    Steps:
      1. Run: npx tsx -e "import { loadConfigFile } from './scripts/archdiagram/config'; const c = await loadConfigFile('/tmp/nonexistent'); console.log(JSON.stringify(c))"
      2. Assert output contains "srcDir":"src"
      3. Assert output contains "tsConfigPath":"tsconfig.json"
    Expected Result: Default config returned when file not found
    Evidence: .sisyphus/evidence/task-3-defaults.txt

  Scenario: CLI flags override config values
    Tool: Bash
    Steps:
      1. Run: npx tsx -e "import { parseCliFlags, mergeConfig, DEFAULT_CONFIG } from './scripts/archdiagram/config'; const cli = parseCliFlags(['--src-dir', 'lib', '--mode', 'static']); const merged = mergeConfig(DEFAULT_CONFIG, cli); console.log(merged.srcDir, merged.llm.provider)"
      2. Assert output contains "lib none"
    Expected Result: CLI --src-dir overrides default, --mode static sets llm.provider to none
    Evidence: .sisyphus/evidence/task-3-cli-merge.txt

  Scenario: Validation rejects non-existent srcDir
    Tool: Bash
    Steps:
      1. Run: npx tsx -e "import { validateConfig, DEFAULT_CONFIG } from './scripts/archdiagram/config'; const r = validateConfig({...DEFAULT_CONFIG, srcDir: '/nonexistent'}); console.log(r.valid, r.errors)"
      2. Assert output starts with "false"
    Expected Result: Validation returns false with error about missing srcDir
    Evidence: .sisyphus/evidence/task-3-validation-error.txt
  ```

  **Commit**: YES (groups with Tasks 1, 2, 4)

- [x] 4. Test Fixtures + Vitest Helpers

  **What to do**:
  - Create test fixture: `tests/fixtures/archdiagram/sample-project/` — a small 8-file TypeScript project:
    ```
    tsconfig.json         # minimal tsconfig with @/ alias
    src/
    ├── index.ts          # barrel: re-exports from services/ and utils/
    ├── app.ts            # imports from services/auth, services/db, utils/logger
    ├── services/
    │   ├── index.ts      # barrel: re-exports auth, db
    │   ├── auth.ts       # exports AuthService class, imports db
    │   └── db.ts         # exports DatabaseClient class
    └── utils/
        ├── index.ts      # barrel: re-exports logger
        └── logger.ts     # exports createLogger function
    ```
  - Each file has meaningful exports: classes, functions, type exports, `use client` directive on app.ts
  - Known expected graph: 8 nodes, ~10 edges, 3 barrel files, 1 circular-ish pattern (auth↔db)
  - Create `tests/archdiagram/helpers.ts`:
    - `FIXTURE_PATH` constant pointing to fixture
    - `loadExpectedGraph()` — returns the known-correct ImportGraph for the fixture
    - `assertValidExcalidraw(json: string)` — parses .excalidraw JSON, checks required fields
    - `assertValidMermaid(content: string)` — checks Mermaid syntax basics (starts with `graph`, has nodes)
  - Write `tests/archdiagram/fixtures.test.ts` — sanity test that fixture files exist and are valid TypeScript

  **Must NOT do**:
  - Don't make the fixture too complex — 8 files max
  - Don't use any external dependencies in the fixture files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None

  **References**:
  - `vitest.config.ts` — existing vitest configuration (verify test file patterns)
  - `tests/` — existing test directory structure
  - `tsconfig.json` — the fixture's tsconfig should mirror the project's path alias pattern

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/fixtures.test.ts` → PASS
  - [ ] `find tests/fixtures/archdiagram/sample-project -name "*.ts" | wc -l` → 8
  - [ ] Fixture tsconfig has `@/*` path alias matching real project pattern

  **QA Scenarios**:
  ```
  Scenario: Fixture project is valid TypeScript
    Tool: Bash
    Preconditions: Fixture files created
    Steps:
      1. Run: npx tsc --project tests/fixtures/archdiagram/sample-project/tsconfig.json --noEmit
      2. Assert exit code 0 (no type errors)
    Expected Result: Fixture compiles without errors
    Evidence: .sisyphus/evidence/task-4-fixture-valid.txt

  Scenario: Test helpers work correctly
    Tool: Bash
    Steps:
      1. Run: npx vitest run tests/archdiagram/fixtures.test.ts --reporter=verbose
      2. Assert all tests pass
    Expected Result: Fixture sanity tests green
    Evidence: .sisyphus/evidence/task-4-helpers.txt
  ```

  **Commit**: YES (groups with Tasks 1, 2, 3)

---

### Wave 2 — Static Analysis Backbone (After Wave 1)

- [x] 5. dependency-cruiser Integration (Import Graph Extraction)

  **What to do**:
  - Implement `scripts/archdiagram/phases/analyze.ts` — `extractImportGraph()` function:
    - Use dependency-cruiser's programmatic `cruise()` API (NOT CLI): `import { cruise } from 'dependency-cruiser'`
    - Options: `{ tsPreCompilationDeps: true, tsConfig: { fileName: config.tsConfigPath }, doNotFollow: { path: config.exclude }, reporterOptions: {} }`
    - Transform `ICruiseResult.modules[]` → `ImportGraph { modules: ModuleNode[], edges: ImportEdge[] }`
    - Each module: extract path (relative to srcDir), detect if barrel (`index.ts` with only re-exports), collect dependency types
    - Each edge: source path, target path (resolved), dependency types array
    - Handle `@/` path alias resolution (tsPreCompilationDeps handles this)
    - Log progress: "Analyzing N files..." with count
  - Write vitest tests in `tests/archdiagram/analyze.test.ts`:
    - Test against sample-project fixture: assert correct node count (8), edge count (~10), barrel detection (3 barrels)
    - Test path alias resolution: imports using `@/` resolve to real paths
    - Test exclude patterns: node_modules and test files excluded
    - Test error case: non-existent srcDir throws descriptive error

  **Must NOT do**:
  - Don't shell out to `npx depcruise` CLI — use the programmatic API
  - Don't resolve barrel exports here (Task 7 handles that)
  - Don't add ts-morph symbol extraction (Task 6)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex API integration with dependency-cruiser's cruise() — needs careful option configuration and output transformation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 7, 8, 15
  - **Blocked By**: Tasks 2, 4

  **References**:
  - `scripts/archdiagram/types.ts:ImportGraph, ImportEdge, ModuleNode` — output types
  - `scripts/component-dependency-graph.js` — existing import graph script (regex-based, reference for output patterns)
  - `tsconfig.json` — the project's tsconfig with `@/*` path alias
  - dependency-cruiser docs: `cruise(fileAndDirectoryArray, cruiseOptions)` returns `{ output: ICruiseResult }` with `modules[].source`, `modules[].dependencies[].resolved`
  - **CRITICAL**: Set `tsPreCompilationDeps: true` — without this, `@/` path aliases are NOT resolved

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/analyze.test.ts` → PASS (all tests green)
  - [ ] Fixture analysis finds exactly 8 modules and ~10 edges
  - [ ] `@/` imports resolve to actual file paths (not left as `@/...`)

  **QA Scenarios**:
  ```
  Scenario: Import graph extraction from fixture project
    Tool: Bash
    Preconditions: Test fixture exists at tests/fixtures/archdiagram/sample-project/
    Steps:
      1. Run: npx tsx -e "import { extractImportGraph } from './scripts/archdiagram/phases/analyze'; const g = await extractImportGraph({ srcDir: 'tests/fixtures/archdiagram/sample-project/src', tsConfigPath: 'tests/fixtures/archdiagram/sample-project/tsconfig.json', exclude: [] }); console.log(JSON.stringify({nodes: g.modules.length, edges: g.edges.length, barrels: g.modules.filter(m=>m.isBarrel).length}))"
      2. Assert output contains "nodes":8 (or close)
      3. Assert output contains "barrels":3
      4. Assert edges > 0
    Expected Result: Correct graph extracted from fixture
    Evidence: .sisyphus/evidence/task-5-import-graph.json

  Scenario: Error on non-existent source directory
    Tool: Bash
    Steps:
      1. Run: npx tsx -e "import { extractImportGraph } from './scripts/archdiagram/phases/analyze'; await extractImportGraph({ srcDir: '/nonexistent', tsConfigPath: 'tsconfig.json', exclude: [] })" 2>&1
      2. Assert exit code non-zero
      3. Assert stderr contains "srcDir" or "not found" or "does not exist"
    Expected Result: Descriptive error about missing source directory
    Evidence: .sisyphus/evidence/task-5-error-handling.txt
  ```

  **Commit**: YES (groups with Tasks 6-8)
  - Message: `feat(archdiagram): add static analysis phase (dependency-cruiser + ts-morph + barrel resolution)`

- [x] 6. ts-morph Symbol Extraction

  **What to do**:
  - Add to `scripts/archdiagram/phases/analyze.ts` — `extractSymbolMap()` function:
    - Initialize ts-morph `Project` with `skipFileDependencyResolution: true`, `skipLoadingLibFiles: true` (keeps RAM <400MB)
    - Add source files from config.srcDir using glob
    - For each source file, extract:
      - Exported declarations via `getExportedDeclarations()`: function, class, type, interface, variable, enum
      - Classify React patterns: component (default export function returning JSX), hook (function starting with `use`), context (`createContext` call)
      - Detect directives: `'use client'`, `'use server'` (check first statement)
      - Count lines of code
    - Use `project.forgetNodesCreatedInBlock()` during batch processing to prevent OOM
    - Enrich the `ModuleNode.exports` array with ExportInfo entries
    - Return enriched ModuleNode[] array that merges with dependency-cruiser output
  - Write vitest tests in `tests/archdiagram/symbols.test.ts`:
    - Test fixture: auth.ts exports AuthService (class), db.ts exports DatabaseClient (class), logger.ts exports createLogger (function)
    - Test `use client` detection on fixture's app.ts
    - Test barrel detection: index.ts files with only re-exports flagged as `isBarrel: true`
    - Test memory: extraction of fixture doesn't exceed expected limits

  **Must NOT do**:
  - Don't initialize ts-morph without `skipFileDependencyResolution: true` + `skipLoadingLibFiles: true` (memory guard)
  - Don't extract function bodies or implementation details — only declarations and exports
  - Don't read test files (*.test.ts, *.spec.ts)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: ts-morph AST traversal is complex — needs understanding of TypeScript compiler API patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 2, 4

  **References**:
  - `scripts/archdiagram/types.ts:ModuleNode, ExportInfo` — output types
  - ts-morph API: `Project({ skipFileDependencyResolution, skipLoadingLibFiles })`, `sourceFile.getExportedDeclarations()`, `forgetNodesCreatedInBlock()`
  - `tests/fixtures/archdiagram/sample-project/` — test fixture with known exports

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/symbols.test.ts` → PASS
  - [ ] Fixture's auth.ts detected as exporting `AuthService` (class kind)
  - [ ] Fixture's app.ts detected as having `use client` directive
  - [ ] Memory usage stays under 400MB for fixture extraction

  **QA Scenarios**:
  ```
  Scenario: Symbol extraction from fixture
    Tool: Bash
    Steps:
      1. Run: npx tsx -e "import { extractSymbolMap } from './scripts/archdiagram/phases/analyze'; const nodes = await extractSymbolMap({ srcDir: 'tests/fixtures/archdiagram/sample-project/src', tsConfigPath: 'tests/fixtures/archdiagram/sample-project/tsconfig.json', exclude: [] }); const auth = nodes.find(n=>n.path.includes('auth')); console.log(JSON.stringify(auth?.exports))"
      2. Assert output contains "AuthService"
      3. Assert output contains "class"
    Expected Result: AuthService class export detected correctly
    Evidence: .sisyphus/evidence/task-6-symbols.json

  Scenario: use client directive detection
    Tool: Bash
    Steps:
      1. Run same extraction, find app.ts node
      2. Assert its directives array contains "use client"
    Expected Result: Directive detected on app.ts
    Evidence: .sisyphus/evidence/task-6-directives.txt
  ```

  **Commit**: YES (groups with Tasks 5, 7, 8)

- [x] 7. Barrel Export Resolver

  **What to do**:
  - Implement `scripts/archdiagram/utils/barrel-resolver.ts` — `resolveBarrelExports()` function:
    - Takes `ImportGraph` as input
    - Detects barrel files: `index.ts` files where ALL exports are re-exports (no original declarations)
    - For each barrel file: trace re-exports to their actual source files using ts-morph `getExportedDeclarations()` which follows through barrels
    - "Inline" barrel edges: if A→barrel→B, create direct edge A→B and mark barrel edge for removal
    - Preserve barrel files as nodes (they still exist) but don't show them as targets of dependency edges
    - Handle nested barrels: `src/index.ts` → `src/services/index.ts` → `src/services/auth.ts`
    - Return modified ImportGraph with resolved edges
  - Write vitest tests in `tests/archdiagram/barrel-resolver.test.ts`:
    - Test fixture: 3 barrel files resolved correctly
    - Test edges A→`services/index.ts`→`services/auth.ts` becomes A→`services/auth.ts`
    - Test nested barrel resolution
    - Test non-barrel index.ts files (with original exports) are NOT resolved away

  **Must NOT do**:
  - Don't remove barrel files from the module list — just resolve the edges through them
  - Don't handle circular barrel re-exports (edge case, explicitly deferred)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Graph transformation logic — needs careful edge manipulation without data loss
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 5)
  - **Blocks**: Task 8
  - **Blocked By**: Task 5

  **References**:
  - `scripts/archdiagram/types.ts:ImportGraph, ImportEdge` — input/output types
  - `scripts/archdiagram/phases/analyze.ts:extractImportGraph()` — provides the raw graph with barrel mega-hubs
  - `tests/fixtures/archdiagram/sample-project/src/index.ts` — fixture barrel file
  - `tests/fixtures/archdiagram/sample-project/src/services/index.ts` — nested barrel fixture

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/barrel-resolver.test.ts` → PASS
  - [ ] After resolution: no edge targets an `index.ts` file that is purely re-exports
  - [ ] Node count unchanged (barrels remain as nodes, just not edge targets)

  **QA Scenarios**:
  ```
  Scenario: Barrel edges resolved to actual targets
    Tool: Bash
    Steps:
      1. Run extraction + barrel resolution on fixture
      2. Collect all edge targets
      3. Assert NO edge target is a barrel file (isBarrel: true)
      4. Assert total edge count >= original (edges were inlined, not removed)
    Expected Result: All barrel mega-hubs eliminated from edge targets
    Evidence: .sisyphus/evidence/task-7-barrel-resolved.json

  Scenario: Non-barrel index.ts preserved as edge target
    Tool: Bash
    Steps:
      1. If fixture has an index.ts with original exports (not just re-exports)
      2. Assert it IS still an edge target after resolution
    Expected Result: Only pure re-export barrels are resolved away
    Evidence: .sisyphus/evidence/task-7-non-barrel-preserved.txt
  ```

  **Commit**: YES (groups with Tasks 5, 6, 8)

- [x] 8. Unified Graph Builder

  **What to do**:
  - Implement `scripts/archdiagram/utils/graph-utils.ts` — `buildUnifiedGraph()` function:
    - Takes: `ImportGraph` (from dep-cruiser + barrel resolution) + `ModuleNode[]` (from ts-morph symbols)
    - Merges: combine import edges with symbol metadata into a single graph
    - Enriches nodes with: export count, primary role (component/hook/service/util/config/type), line count, directive
    - Computes module-level summary: group files by top-level directory, compute inter-group edge counts
    - Produces `ImportGraph` with fully enriched `ModuleNode[]` + clean `ImportEdge[]`
    - Also produces a directory-level summary graph (for C4 L1 generation)
  - Write vitest tests in `tests/archdiagram/graph-utils.test.ts`:
    - Test merge: dep-cruiser edges + ts-morph symbols = unified nodes with both edge and export data
    - Test directory-level grouping: files grouped by top-level dir
    - Test role classification: files with `use client` + default export → component; files starting with `use` → hook

  **Must NOT do**:
  - Don't apply LLM-based grouping here (that's Phase 2)
  - Don't compute layout coordinates (that's Phase 3)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Data merging and enrichment — combining two data sources into one clean graph
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Tasks 5, 6, 7)
  - **Blocks**: Tasks 12, 13, 15, 18
  - **Blocked By**: Tasks 5, 6, 7

  **References**:
  - `scripts/archdiagram/types.ts:ImportGraph, ModuleNode, ImportEdge` — input/output types
  - `scripts/archdiagram/phases/analyze.ts` — provides raw import graph + symbol map
  - `scripts/archdiagram/utils/barrel-resolver.ts` — provides barrel-resolved graph

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/graph-utils.test.ts` → PASS
  - [ ] Unified graph has same nodes as import graph but with symbol metadata attached
  - [ ] Directory-level summary groups fixture into 3 groups (root, services, utils)

  **QA Scenarios**:
  ```
  Scenario: Full static analysis pipeline on fixture
    Tool: Bash
    Steps:
      1. Run: extractImportGraph → resolveBarrelExports → extractSymbolMap → buildUnifiedGraph on fixture
      2. Assert unified graph has 8 nodes with exports attached
      3. Assert directory summary has exactly 3 groups
      4. Assert every node has a role classification
    Expected Result: Complete enriched graph from fixture
    Evidence: .sisyphus/evidence/task-8-unified-graph.json

  Scenario: No data loss in merge
    Tool: Bash
    Steps:
      1. Count edges before merge, count edges after merge
      2. Assert edge count is identical (merge doesn't add/remove edges)
    Expected Result: Edge count preserved through merge
    Evidence: .sisyphus/evidence/task-8-no-data-loss.txt
  ```

  **Commit**: YES (groups with Tasks 5, 6, 7)

---

### Wave 3 — LLM Reasoning + Layout (After Wave 2)

- [x] 9. LLM Prompt Templates + Structured Output Schemas

  **What to do**:
  - Implement `scripts/archdiagram/phases/reason.ts` — prompt template definitions:
    - `FILE_ANALYST_SYSTEM_PROMPT`: System prompt for Agent 1 (File Analyst) — given file summaries (path, exports, imports, directives), classify each file's purpose and role. Output: JSON array `[{ filePath, purpose, role }]`
    - `ARCHITECT_SYSTEM_PROMPT`: System prompt for Agent 2 (Architect) — given file summaries + import edge data, group files into C4 modules and identify relationships. Output: JSON `{ groups: ModuleGroup[], relationships: ModuleRelationship[] }`
    - Include `VALID_FILE_PATHS: [...]` injection point in both prompts to prevent hallucination
    - Include C4 vocabulary constraints: "Group by user-facing FEATURES, not code layers. GOOD: 'Payment Processing', 'User Authentication'. BAD: 'Services', 'Components', 'Utils'"
    - `buildAnalystPrompt(batch: ModuleNode[]): string` — constructs the full prompt with file data injected
    - `buildArchitectPrompt(summaries: FileSummary[], edges: ImportEdge[]): string` — constructs the architecture prompt
  - Define Zod schemas for structured output validation:
    - `FileSummarySchema`: z.object({ filePath: z.string(), purpose: z.string(), role: z.enum([...]) })
    - `ArchitectureOutputSchema`: z.object({ groups: z.array(ModuleGroupSchema), relationships: z.array(RelationshipSchema) })
  - Write vitest tests in `tests/archdiagram/prompts.test.ts`:
    - Test prompt construction includes all file paths
    - Test VALID_FILE_PATHS injection contains exact paths from input
    - Test Zod schema validates correct input, rejects invalid input
    - Test hallucinated file paths caught by schema validation

  **Must NOT do**:
  - Don't call any LLM API here — this is pure prompt template and schema work
  - Don't hardcode temperature or model — those come from config

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Prompt engineering + structured output design — critical for diagram quality
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 10, 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 11, 12
  - **Blocked By**: Task 2

  **References**:
  - `scripts/archdiagram/types.ts:ModuleGroup, ModuleRelationship, ArchitectureGraph` — output types
  - BlueLens two-agent pattern: File Analyst batched → Architect with summaries + edges
  - CodeBoarding's VALID_FILE_PATHS injection pattern
  - Zod validation: `z.object({}).parse()` for runtime validation

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/prompts.test.ts` → PASS
  - [ ] VALID_FILE_PATHS in prompt matches input exactly
  - [ ] Zod schema rejects response with hallucinated file path not in input set

  **QA Scenarios**:
  ```
  Scenario: Prompt includes all valid file paths
    Tool: Bash
    Steps:
      1. Build analyst prompt with 3 fixture files
      2. Assert prompt string contains all 3 exact file paths
      3. Assert prompt contains "VALID FILE PATHS"
    Expected Result: All file paths present in prompt for anti-hallucination
    Evidence: .sisyphus/evidence/task-9-prompt-paths.txt

  Scenario: Schema rejects hallucinated paths
    Tool: Bash
    Steps:
      1. Create FileSummary with filePath "src/nonexistent.ts"
      2. Validate against schema with validPaths set to ["src/auth.ts", "src/db.ts"]
      3. Assert validation fails
    Expected Result: Hallucinated path rejected by validation
    Evidence: .sisyphus/evidence/task-9-hallucination-reject.txt
  ```

  **Commit**: YES (groups with Tasks 10-12)
  - Message: `feat(archdiagram): add LLM reasoning phase (prompts, API adapter, validation, orchestrator)`

- [x] 10. Anthropic API Adapter

  **What to do**:
  - Implement `scripts/archdiagram/phases/reason.ts` — `callLLM()` and `batchAnalyze()` functions:
    - `callLLM(prompt: string, schema: z.ZodSchema, config: LLMConfig): Promise<T>` — generic LLM call wrapper
    - Uses `@anthropic-ai/sdk` `Anthropic().messages.create()` with `model: config.model ?? 'claude-sonnet-4-20250514'`, `temperature: config.temperature ?? 0.1`, `max_tokens: 4096`
    - Parse response: extract JSON from content block, validate with Zod schema
    - Handle markdown fences defensively: strip ```json ... ``` if present
    - Retry logic: max 3 attempts, on parse/validation failure include error in retry prompt
    - `batchAnalyze(nodes: ModuleNode[], config: LLMConfig): Promise<FileSummary[]>` — batch File Analyst calls, one batch per directory cluster (not arbitrary 10-file chunks)
    - If `config.provider === 'none'`: skip LLM entirely, return empty summaries (static-only mode)
    - Log: "Analyzing batch N/M: directory-name (K files)..."
  - Write vitest tests in `tests/archdiagram/llm-adapter.test.ts`:
    - Mock `@anthropic-ai/sdk` — test that correct model/temperature/prompt sent
    - Test JSON extraction from markdown-fenced response
    - Test retry on invalid JSON (mock first call returns garbage, second returns valid)
    - Test static-only mode returns empty results
    - Test provider=none skips all API calls

  **Must NOT do**:
  - Don't make live API calls in tests — mock the SDK
  - Don't hardcode API key — read from `process.env.ANTHROPIC_API_KEY`
  - Don't batch by fixed 10-file chunks — batch by directory (pre-clustering from Task 12)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API integration with retry logic and response parsing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 9, 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Task 2

  **References**:
  - `@anthropic-ai/sdk` API: `new Anthropic().messages.create({ model, messages, max_tokens, temperature })`
  - `scripts/archdiagram/types.ts:LLMConfig` — provider/apiKey/model/temperature config
  - BlueLens retry pattern: include error message from previous attempt in retry prompt

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/llm-adapter.test.ts` → PASS
  - [ ] Static-only mode (provider=none) makes zero API calls
  - [ ] Retry logic invoked on parse failure (verified via mock call count)

  **QA Scenarios**:
  ```
  Scenario: Static-only mode makes no API calls
    Tool: Bash
    Steps:
      1. Run batchAnalyze with config.provider = 'none'
      2. Assert result is empty array
      3. Assert Anthropic constructor never called (via mock)
    Expected Result: Zero API interaction in static mode
    Evidence: .sisyphus/evidence/task-10-static-mode.txt

  Scenario: Retry on invalid JSON response
    Tool: Bash (vitest)
    Steps:
      1. Mock first API call returns "not json"
      2. Mock second API call returns valid JSON
      3. Assert callLLM succeeds on second attempt
      4. Assert mock was called exactly 2 times
    Expected Result: Automatic retry with error feedback
    Evidence: .sisyphus/evidence/task-10-retry.txt
  ```

  **Commit**: YES (groups with Tasks 9, 11, 12)

- [x] 11. Response Validation + Hallucination Prevention

  **What to do**:
  - Implement `scripts/archdiagram/phases/reason.ts` — `validateArchitectureResponse()` function:
    - 6-layer validation (CodeBoarding pattern):
      1. **JSON parse**: validate response is parseable JSON
      2. **Schema validation**: Zod schema check (structure, field types)
      3. **File path validation**: every `filePath` in response MUST exist in `validPaths` set
      4. **Relationship validation**: every `from`/`to` in relationships MUST be a defined group name
      5. **Coverage validation**: every input file appears in exactly one group (no orphans, no duplicates)
      6. **Bidirectional coverage**: every group has at least one file (no empty groups)
    - Returns `{ valid: boolean; errors: string[]; layer: number }` — which layer failed
    - `buildRetryPrompt(originalPrompt: string, errors: string[]): string` — includes specific validation errors for targeted retry
  - Write vitest tests in `tests/archdiagram/validation.test.ts`:
    - Test each layer independently with crafted valid/invalid inputs
    - Test hallucinated path detection (layer 3)
    - Test orphan file detection (layer 5)
    - Test empty group detection (layer 6)
    - Test retry prompt includes specific error messages

  **Must NOT do**:
  - Don't suppress validation errors — always return specific error messages
  - Don't auto-fix hallucinated paths — reject and retry

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 6-layer validation pipeline — needs systematic correctness guarantees
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 9 for schemas)
  - **Parallel Group**: Wave 3 (sequential after Task 9)
  - **Blocks**: Task 12
  - **Blocked By**: Task 9

  **References**:
  - CodeBoarding 6-layer validation pattern (from research findings)
  - `scripts/archdiagram/phases/reason.ts` — prompt templates and Zod schemas from Task 9
  - `scripts/archdiagram/types.ts:ModuleGroup, ModuleRelationship` — types to validate against

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/validation.test.ts` → PASS
  - [ ] Layer 3 catches hallucinated file path "src/does-not-exist.ts"
  - [ ] Layer 5 catches orphan file not assigned to any group
  - [ ] Retry prompt contains specific error message from failed layer

  **QA Scenarios**:
  ```
  Scenario: Hallucinated path caught at layer 3
    Tool: Bash (vitest)
    Steps:
      1. Create response with filePath "src/phantom.ts" not in validPaths
      2. Run validateArchitectureResponse
      3. Assert valid === false, layer === 3
      4. Assert errors contains "phantom.ts"
    Expected Result: Hallucination caught with specific error
    Evidence: .sisyphus/evidence/task-11-hallucination.txt

  Scenario: Orphan file caught at layer 5
    Tool: Bash (vitest)
    Steps:
      1. Create response with 7 of 8 fixture files grouped (one missing)
      2. Run validation
      3. Assert valid === false, layer === 5
      4. Assert errors mentions the orphan file
    Expected Result: Coverage gap detected
    Evidence: .sisyphus/evidence/task-11-orphan.txt
  ```

  **Commit**: YES (groups with Tasks 9, 10, 12)

- [x] 12. Directory Pre-Clustering + LLM Orchestrator

  **What to do**:
  - Implement `scripts/archdiagram/phases/reason.ts` — `orchestrateLLMReasoning()` function:
    - **Pre-clustering**: Group files by top-level directory (e.g., `src/services/*` → one cluster, `src/utils/*` → another). This produces ~15-20 clusters vs ~150 arbitrary batches
    - **Phase 2a (File Analyst)**: For each cluster, call `batchAnalyze()` with directory's files. Run clusters in parallel (Promise.allSettled with concurrency limit of 5)
    - **Phase 2b (Architect)**: Collect all file summaries + import edges, call `callLLM()` with architect prompt. Single call.
    - **Validation**: Run `validateArchitectureResponse()`. If fails, retry up to 3 times with error feedback
    - **Fallback**: If all retries fail OR provider=none, fall back to directory-based grouping (deterministic: each top-level directory = one module)
    - Returns `ArchitectureGraph` — either LLM-enriched or directory-based fallback
    - Log progress: "LLM analysis: cluster N/M...", "Architect reasoning...", "Validation: layer N passed/failed"
  - Write vitest tests in `tests/archdiagram/orchestrator.test.ts`:
    - Test pre-clustering groups files by directory correctly
    - Test parallel batch execution (mock API, verify concurrency)
    - Test fallback to directory grouping when provider=none
    - Test retry on validation failure
    - Test final output matches ArchitectureGraph schema

  **Must NOT do**:
  - Don't skip validation even if LLM response "looks good" — always run all 6 layers
  - Don't exceed concurrency limit of 5 parallel API calls
  - Don't crash on API failure — fall back to directory grouping

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Orchestration logic with concurrency, retries, fallback — complex control flow
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Tasks 9, 10, 11)
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 9, 10, 11

  **References**:
  - `scripts/archdiagram/phases/reason.ts` — prompt templates (Task 9), API adapter (Task 10), validation (Task 11)
  - `scripts/archdiagram/types.ts:ArchitectureGraph, ModuleGroup` — output types
  - BlueLens directory pre-clustering pattern

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/orchestrator.test.ts` → PASS
  - [ ] Pre-clustering groups 8-file fixture into 3 clusters (root, services, utils)
  - [ ] Fallback mode produces valid ArchitectureGraph without any API calls
  - [ ] Retry loop invoked on validation failure (verified via mock)

  **QA Scenarios**:
  ```
  Scenario: Static fallback produces valid architecture graph
    Tool: Bash
    Steps:
      1. Run orchestrateLLMReasoning with provider=none on fixture graph
      2. Assert output has groups property with 3+ groups
      3. Assert output has relationships property
      4. Assert every file appears in exactly one group
    Expected Result: Deterministic directory-based grouping without LLM
    Evidence: .sisyphus/evidence/task-12-fallback.json

  Scenario: Pre-clustering groups by directory
    Tool: Bash (vitest)
    Steps:
      1. Cluster 8 fixture files
      2. Assert 3 clusters: root (index.ts, app.ts), services (index.ts, auth.ts, db.ts), utils (index.ts, logger.ts)
    Expected Result: Files grouped by parent directory
    Evidence: .sisyphus/evidence/task-12-clustering.txt
  ```

  **Commit**: YES (groups with Tasks 9, 10, 11)

- [x] 13. ELK.js Layout Engine

  **What to do**:
  - Implement `scripts/archdiagram/phases/layout.ts` — `computeLayout()` function:
    - Import ELK: `import ELK from 'elkjs/lib/elk.bundled.js'` (NOT default export — that's the web worker version)
    - Convert `ArchitectureGraph` → ELK input format:
      - Each `ModuleGroup` → ELK node with `id`, `width` (calculated: `max(160, label.length * 9)`), `height: 80`
      - Each `ModuleRelationship` → ELK edge with `sources: [from]`, `targets: [to]`
      - For C4 L1 (system overview): groups are top-level nodes
      - For C4 L2 (container): groups become parent nodes with child files as sub-nodes
    - Layout options: `elk.algorithm: 'layered'`, `elk.direction: config.style.direction` (default 'RIGHT'), `elk.spacing.nodeNode: 80`, `elk.layered.spacing.nodeNodeBetweenLayers: 120`, `elk.edgeRouting: 'ORTHOGONAL'`
    - Extract results: `layouted.children[i].x`, `.y` → `LayoutNode` array; `layouted.edges[i].sections[0].bendPoints` → `LayoutEdge` array
    - Compute zones: bounding boxes around groups of related nodes (add 40px padding)
    - Returns `LayoutedDiagram` with positioned nodes, edges with bend points, and zones
  - Write vitest tests in `tests/archdiagram/layout.test.ts`:
    - Test layout produces valid coordinates (x >= 0, y >= 0, no NaN)
    - Test no overlapping nodes (bounding boxes don't intersect)
    - Test width calculation formula: `max(160, charCount * 9)`
    - Test zone computation: zone contains all its member nodes
    - Test with 3-node fixture graph → expected spatial relationships (A left of B if A→B edge exists)

  **Must NOT do**:
  - Don't use `import ELK from 'elkjs'` — that's the web worker version, fails in Node.js
  - Don't hardcode layout options — read from config.style
  - Don't compute Excalidraw-specific rendering here (that's Phase 4)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: ELK.js integration with coordinate transformation — well-documented API but needs careful mapping
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 9-11, independent of LLM)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 14, 16, 18
  - **Blocked By**: Task 8

  **References**:
  - `scripts/archdiagram/types.ts:LayoutedDiagram, LayoutNode, LayoutEdge, LayoutZone` — output types
  - ELK.js API: `new ELK().layout({ id, children: [{id, width, height}], edges: [{id, sources, targets}], layoutOptions })` returns positioned graph
  - **CRITICAL**: Import as `elkjs/lib/elk.bundled.js` — the default export is a web worker wrapper that crashes in Node.js
  - Design guide: minimum 40px gap between shapes, 80px arrow length

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/layout.test.ts` → PASS
  - [ ] All node coordinates >= 0 and not NaN
  - [ ] No overlapping nodes (bounding box intersection test)
  - [ ] Zone bounding boxes contain all member nodes

  **QA Scenarios**:
  ```
  Scenario: Layout produces valid non-overlapping positions
    Tool: Bash
    Steps:
      1. Create 5-node graph with 6 edges
      2. Run computeLayout
      3. Assert all nodes have x >= 0, y >= 0
      4. For each pair of nodes, assert bounding boxes don't overlap (with 40px margin)
    Expected Result: Clean non-overlapping layout
    Evidence: .sisyphus/evidence/task-13-layout.json

  Scenario: Width formula applied correctly
    Tool: Bash (vitest)
    Steps:
      1. Create node with label "Authentication Service" (23 chars)
      2. Assert computed width = max(160, 23 * 9) = 207
      3. Create node with label "DB" (2 chars)
      4. Assert computed width = max(160, 2 * 9) = 160 (minimum)
    Expected Result: Width formula prevents text truncation
    Evidence: .sisyphus/evidence/task-13-width.txt
  ```

  **Commit**: YES (standalone)
  - Message: `feat(archdiagram): add ELK.js layout engine`

---

### Wave 4 — Rendering (After Wave 3)

- [x] 14. Excalidraw JSON Renderer

  **What to do**:
  - Implement `scripts/archdiagram/renderers/excalidraw.ts` — `renderExcalidraw()` function:
    - Takes `LayoutedDiagram` → produces `.excalidraw` JSON file
    - Generate elements following the MCP design guide color palette:
      - Zones (background rectangles): light fill, low opacity (0.3), large rectangles with group label as text element at top-left
      - Nodes (rectangles): colored by role — frontend=#a5d8ff (light blue), backend=#eebefa (light purple), data=#99e9f2 (light cyan), shared=#e9ecef (light gray), external=#ffd8a8 (light orange). Stroke colors match palette.
      - Arrows: connect via `startBinding`/`endBinding` with `elementId` and `fixedPoint` for edge routing. Solid for sync, dashed for async.
      - Labels: each node has `label` property with the module/group name. Font size 16 for nodes, 20 for zone titles.
    - Width from layout: use `LayoutNode.width` (already computed with formula)
    - Arrow routing: use `LayoutEdge.bendPoints` for `points` array
    - Output structure: `{ type: "excalidraw", version: 2, elements: [...], appState: { gridSize: 20, viewBackgroundColor: "#ffffff" } }`
    - Write to `{outputDir}/system-overview.excalidraw` (C4 L1) and `{outputDir}/container-{name}.excalidraw` (C4 L2 per group)
  - Write vitest tests in `tests/archdiagram/excalidraw-renderer.test.ts`:
    - Test output is valid JSON with `type: "excalidraw"`
    - Test element count matches node count + edge count + zone count + labels
    - Test arrow bindings reference valid element IDs
    - Test zone rectangle contains all member node rectangles (spatial containment)

  **Must NOT do**:
  - Don't use any MCP tools here — this is pure JSON file generation
  - Don't try to render to canvas (Task 16)
  - Don't hardcode colors — use the style config, falling back to the design guide palette

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Excalidraw JSON format generation — needs precise element structure with bindings
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 15, 16)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 17, 18
  - **Blocked By**: Task 13

  **References**:
  - `scripts/archdiagram/types.ts:LayoutedDiagram, LayoutNode, LayoutEdge, LayoutZone, RenderResult` — input/output types
  - Excalidraw JSON schema: `{ type, version, elements[], appState }` — from research findings
  - MCP design guide color palette (from `read_diagram_guide`): stroke/fill color pairs, sizing rules, arrow binding with `startBinding`/`endBinding` and `fixedPoint`
  - `fixedPoint` values: top=[0.5,0], bottom=[0.5,1], left=[0,0.5], right=[1,0.5]

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/excalidraw-renderer.test.ts` → PASS
  - [ ] Generated .excalidraw JSON parses without error
  - [ ] All arrow startBinding/endBinding reference valid element IDs in the same file
  - [ ] File opens correctly when imported via `import_scene` MCP tool (manual verification)

  **QA Scenarios**:
  ```
  Scenario: Valid .excalidraw JSON generated
    Tool: Bash
    Steps:
      1. Run renderExcalidraw on fixture's layouted diagram
      2. Parse output JSON: assert type === "excalidraw", version === 2
      3. Assert elements.length > 0
      4. For each arrow element: assert startBinding.elementId exists in elements array
      5. Write to /tmp/test-diagram.excalidraw
    Expected Result: Structurally valid .excalidraw file
    Evidence: .sisyphus/evidence/task-14-excalidraw.json

  Scenario: Zone contains member nodes spatially
    Tool: Bash
    Steps:
      1. For each zone in output: get zone x,y,width,height
      2. For each node assigned to that zone: assert node x >= zone x and node x+width <= zone x+zone width (with padding)
    Expected Result: Visual containment verified programmatically
    Evidence: .sisyphus/evidence/task-14-containment.txt
  ```

  **Commit**: YES (groups with Tasks 15-17)
  - Message: `feat(archdiagram): add rendering phase (Excalidraw JSON, Mermaid, MCP canvas, SVG/PNG)`

- [x] 15. Mermaid Markdown Renderer

  **What to do**:
  - Implement `scripts/archdiagram/renderers/mermaid.ts` — `renderMermaid()` function:
    - Takes `ArchitectureGraph` (NOT LayoutedDiagram — Mermaid does its own layout) → produces Mermaid `.md` file
    - For C4 L1 (system overview):
      ```
      graph LR
        subgraph Frontend["Frontend Layer"]
          auth["Authentication"]
          dashboard["Dashboard"]
        end
        subgraph Backend["Backend Services"]
          payments["Payment Processing"]
        end
        auth -->|"API calls"| payments
      ```
    - For C4 L2 (container): one diagram per group showing internal files
    - Node IDs: sanitized (alphanumeric + underscore only, no spaces/special chars)
    - Edge labels from `ModuleRelationship.label`
    - Subgraphs from `ModuleGroup`
    - Write markdown file with `# Architecture: System Overview` header + fenced Mermaid block
    - Output: `{outputDir}/system-overview.md` and `{outputDir}/container-{name}.md`
  - Write vitest tests in `tests/archdiagram/mermaid-renderer.test.ts`:
    - Test output starts with `graph LR` or `graph TD`
    - Test every group becomes a subgraph
    - Test node IDs are alphanumeric only
    - Test no forbidden Mermaid characters in labels: `"{}:()`

  **Must NOT do**:
  - Don't use LayoutedDiagram — Mermaid has its own layout engine
  - Don't try to control exact positioning in Mermaid (impossible)
  - Don't include characters forbidden in Mermaid: `"{}:()`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: String template generation — straightforward text output
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 14, 16)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 17, 18
  - **Blocked By**: Task 8

  **References**:
  - `scripts/archdiagram/types.ts:ArchitectureGraph, ModuleGroup, ModuleRelationship` — input types
  - Mermaid syntax: `graph LR`, `subgraph Name["Label"]`, `A -->|"label"| B`
  - Forbidden Mermaid characters: `"{}:()` — must be stripped from labels

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/mermaid-renderer.test.ts` → PASS
  - [ ] `npx mmdc -i docs/architecture/system-overview.md -o /tmp/test.svg` → exits 0 (valid Mermaid)
  - [ ] No forbidden characters in output

  **QA Scenarios**:
  ```
  Scenario: Valid Mermaid syntax generated
    Tool: Bash
    Steps:
      1. Run renderMermaid on fixture's architecture graph
      2. Write output to /tmp/test-mermaid.md
      3. Run: npx mmdc -i /tmp/test-mermaid.md -o /tmp/test-mermaid.svg
      4. Assert exit code 0
    Expected Result: Mermaid CLI renders without errors
    Evidence: .sisyphus/evidence/task-15-mermaid-valid.svg

  Scenario: No forbidden characters
    Tool: Bash
    Steps:
      1. Run renderMermaid
      2. grep for forbidden chars: grep -E '[{}:()]' in Mermaid body (not markdown header)
      3. Assert no matches
    Expected Result: Clean Mermaid output
    Evidence: .sisyphus/evidence/task-15-no-forbidden.txt
  ```

  **Commit**: YES (groups with Tasks 14, 16, 17)

- [x] 16. Excalidraw MCP Canvas Renderer

  **What to do**:
  - Implement `scripts/archdiagram/renderers/canvas.ts` — `renderToCanvas()` function:
    - Takes `LayoutedDiagram` → renders to live Excalidraw canvas via MCP-style HTTP API
    - **NOT using MCP tools directly** (unavailable from npm scripts) — instead, call the Excalidraw canvas REST API at `EXPRESS_SERVER_URL` (default `http://localhost:3111`)
    - Steps:
      1. POST `/api/clear` — clear existing canvas
      2. POST `/api/elements/batch` — create all elements (zones, nodes, arrows) in one batch
      3. POST `/api/viewport` — set viewport to scroll-to-content (zoom to fit)
    - Element format follows MCP batch_create_elements schema: `{ type, x, y, width, height, text, backgroundColor, strokeColor, startElementId, endElementId }`
    - Custom IDs on shapes so arrows can reference them
    - Graceful failure: if canvas not running (connection refused), log warning and skip — not an error
    - For Claude Code interactive mode: export `getCanvasInstructions()` that returns markdown instructions for the Claude Code skill to use MCP tools directly
  - Write vitest tests in `tests/archdiagram/canvas-renderer.test.ts`:
    - Mock HTTP calls — verify correct endpoints and element format
    - Test graceful failure on connection refused
    - Test element batch structure matches MCP schema

  **Must NOT do**:
  - Don't import MCP tools — they're session-bound
  - Don't crash if canvas isn't running — graceful skip
  - Don't require the canvas for any other output format to work

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: HTTP API integration with the Excalidraw canvas REST endpoints
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 14, 15)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 18
  - **Blocked By**: Task 13

  **References**:
  - Excalidraw MCP canvas REST API: `POST /api/elements/batch`, `POST /api/clear`, `POST /api/viewport`
  - `scripts/archdiagram/types.ts:LayoutedDiagram` — input type
  - MCP batch_create_elements schema: elements with `id`, `type`, `x`, `y`, `width`, `height`, `text`, `startElementId`, `endElementId`
  - Canvas start script: `~/.local/share/mcp-servers/start-excalidraw-canvas.sh` (port 3111)

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/canvas-renderer.test.ts` → PASS
  - [ ] Element batch format matches MCP schema (verified by mock)
  - [ ] Connection refused produces warning log, not crash

  **QA Scenarios**:
  ```
  Scenario: Canvas not running — graceful failure
    Tool: Bash
    Steps:
      1. Ensure no Excalidraw canvas running on port 3111
      2. Run renderToCanvas with fixture diagram
      3. Assert exit code 0 (no crash)
      4. Assert stderr/log contains "canvas not available" or similar warning
    Expected Result: Graceful skip when canvas unavailable
    Evidence: .sisyphus/evidence/task-16-no-canvas.txt

  Scenario: Correct HTTP batch structure (mocked)
    Tool: Bash (vitest)
    Steps:
      1. Mock HTTP server
      2. Run renderToCanvas
      3. Capture POST /api/elements/batch body
      4. Assert body is array with elements having: type, x, y, width, height
      5. Assert arrows have startElementId and endElementId
    Expected Result: Valid element batch sent to canvas API
    Evidence: .sisyphus/evidence/task-16-batch-structure.json
  ```

  **Commit**: YES (groups with Tasks 14, 15, 17)

- [x] 17. SVG/PNG Image Export

  **What to do**:
  - Implement `scripts/archdiagram/renderers/image.ts` — `renderImage()` function:
    - Two export paths:
      1. **Mermaid CLI path** (headless, always works): Run `npx mmdc -i {mermaidFile} -o {outputDir}/system-overview.svg` using `child_process.execFile`. Also `-o ...png` for PNG.
      2. **Canvas path** (requires browser): If canvas is running and has elements, call `GET /api/export/image?format=svg` (or png). This uses the Excalidraw renderer for higher quality.
    - Try canvas path first, fall back to Mermaid CLI path
    - Output: `{outputDir}/system-overview.svg`, `{outputDir}/system-overview.png`
    - Returns `RenderResult` with success/error status
  - Write vitest tests in `tests/archdiagram/image-renderer.test.ts`:
    - Mock child_process.execFile for mmdc call
    - Test fallback: canvas unavailable → mmdc used
    - Test file output paths correct

  **Must NOT do**:
  - Don't require puppeteer or headless browser for image export — use mmdc CLI
  - Don't fail if neither canvas nor mmdc available — return error in RenderResult

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple exec wrapper around mmdc CLI + HTTP fallback
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 14 for canvas path, Task 15 for Mermaid path)
  - **Parallel Group**: Wave 4 (after Tasks 14, 15)
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 14, 15

  **References**:
  - `@mermaid-js/mermaid-cli`: `npx mmdc -i input.md -o output.svg` — CLI for Mermaid rendering
  - Excalidraw canvas export API: `GET /api/export/image?format=svg`
  - `scripts/archdiagram/types.ts:RenderResult` — output type

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/image-renderer.test.ts` → PASS
  - [ ] mmdc fallback produces valid SVG file
  - [ ] Both paths unavailable returns error in RenderResult (no crash)

  **QA Scenarios**:
  ```
  Scenario: Mermaid CLI produces SVG
    Tool: Bash
    Steps:
      1. Create simple Mermaid file: "graph LR\n  A-->B"
      2. Run: npx mmdc -i /tmp/test.md -o /tmp/test.svg
      3. Assert /tmp/test.svg exists and starts with "<svg"
    Expected Result: Valid SVG from Mermaid CLI
    Evidence: .sisyphus/evidence/task-17-svg.svg

  Scenario: Both paths unavailable — graceful error
    Tool: Bash (vitest)
    Steps:
      1. Mock mmdc to fail, canvas not available
      2. Run renderImage
      3. Assert result.success === false
      4. Assert result.error contains descriptive message
    Expected Result: No crash, error captured in result
    Evidence: .sisyphus/evidence/task-17-no-renderer.txt
  ```

  **Commit**: YES (groups with Tasks 14, 15, 16)

---

### Wave 5 — Integration + Entry Points (After Wave 4)

- [x] 18. Pipeline Orchestrator

  **What to do**:
  - Implement `scripts/archdiagram/index.ts` — `runPipeline()` function:
    - Takes `ArchDiagramConfig` → orchestrates all 4 phases in sequence:
      1. **Phase 1 (Static Analysis)**: `extractImportGraph()` → `resolveBarrelExports()` → `extractSymbolMap()` → `buildUnifiedGraph()`
      2. **Phase 2 (LLM Reasoning)**: `orchestrateLLMReasoning()` — if provider=none, uses directory fallback
      3. **Phase 3 (Layout)**: `computeLayout()` — runs for each C4 level (L1 overview, L2 per group)
      4. **Phase 4 (Rendering)**: Run requested formats in parallel: `renderExcalidraw()`, `renderMermaid()`, `renderToCanvas()`, `renderImage()`
    - Mode handling:
      - `--mode static`: provider=none, skips LLM, uses directory grouping
      - `--mode full`: requires ANTHROPIC_API_KEY, runs LLM analysis
      - `--mode auto` (default): checks for ANTHROPIC_API_KEY, uses LLM if available, falls back to static
    - `--phase` flag: run only specific phase (analyze-only, reason-only, layout-only, render-only) — useful for debugging
    - `--validate-only`: run static analysis + validate all node labels map to real files, then exit
    - `--dry-run`: run everything except file writes — print what would be generated
    - Progress logging: phase start/end timestamps, file counts, rendering results
    - Error handling: phase failures are caught, logged, and returned in result — pipeline doesn't crash
    - Returns `PipelineResult { phases: PhaseResult[], outputs: RenderResult[], duration: number }`
  - Write vitest integration test in `tests/archdiagram/pipeline.test.ts`:
    - Test full static pipeline on fixture: produces .excalidraw + .md files
    - Test --mode static skips LLM
    - Test --dry-run produces no files
    - Test --validate-only exits after analysis
    - Test phase error doesn't crash pipeline

  **Must NOT do**:
  - Don't catch and silence errors — log them and include in result
  - Don't make LLM a hard requirement for any mode — always fall back to static

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex orchestration with multiple modes, flags, error handling, and phase sequencing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (first task)
  - **Blocks**: Tasks 19, 20, 21
  - **Blocked By**: Tasks 8, 12, 13, 14, 15, 16, 17

  **References**:
  - All phase modules: `scripts/archdiagram/phases/analyze.ts`, `reason.ts`, `layout.ts`
  - All renderers: `scripts/archdiagram/renderers/excalidraw.ts`, `mermaid.ts`, `canvas.ts`, `image.ts`
  - `scripts/archdiagram/types.ts` — all types
  - `scripts/archdiagram/config.ts` — config loading

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/pipeline.test.ts` → PASS
  - [ ] Static pipeline on fixture produces 2+ output files
  - [ ] `--dry-run` creates zero files
  - [ ] Pipeline returns structured result with timing data

  **QA Scenarios**:
  ```
  Scenario: Full static pipeline end-to-end on fixture
    Tool: Bash
    Steps:
      1. Run: npx tsx scripts/archdiagram/index.ts --src-dir tests/fixtures/archdiagram/sample-project/src --ts-config tests/fixtures/archdiagram/sample-project/tsconfig.json --mode static --output-dir /tmp/archdiagram-test
      2. Assert /tmp/archdiagram-test/system-overview.excalidraw exists
      3. Assert /tmp/archdiagram-test/system-overview.md exists
      4. Parse .excalidraw JSON: assert elements.length > 0
      5. Assert Mermaid file contains "graph"
    Expected Result: Complete diagram output from fixture
    Evidence: .sisyphus/evidence/task-18-e2e-static.json

  Scenario: Dry run produces no output files
    Tool: Bash
    Steps:
      1. Run pipeline with --dry-run --output-dir /tmp/archdiagram-dry
      2. Assert /tmp/archdiagram-dry/ is empty or doesn't exist
    Expected Result: No files written in dry run
    Evidence: .sisyphus/evidence/task-18-dry-run.txt
  ```

  **Commit**: YES (groups with Tasks 19-21)
  - Message: `feat(archdiagram): add pipeline orchestrator, npm script, Claude Code skill, CI integration`

- [x] 19. npm Script Entry Point + package.json

  **What to do**:
  - Implement `scripts/generate-architecture-diagram.ts` — the npm script entry point:
    - Shebang: `#!/usr/bin/env tsx`
    - Import config loader, pipeline orchestrator
    - `async function main()`:
      1. Load config from `archdiagram.config.ts` (if exists)
      2. Parse CLI flags from `process.argv`
      3. Merge config (file + CLI)
      4. Validate config
      5. If `--help`: print usage and exit
      6. Run `runPipeline(config)`
      7. Print results summary
      8. Exit with code 0 (success) or 1 (any phase failed)
    - Print help text: all supported flags, examples, mode descriptions
  - Add to `package.json` scripts:
    ```json
    "docs:diagram": "tsx scripts/generate-architecture-diagram.ts",
    "docs:diagram:static": "tsx scripts/generate-architecture-diagram.ts --mode static",
    "docs:diagram:full": "tsx scripts/generate-architecture-diagram.ts --mode full"
    ```
  - Create example `archdiagram.config.ts` at project root (committed but gitignored from production build):
    ```typescript
    import type { ArchDiagramConfig } from './scripts/archdiagram/types';
    export default { srcDir: 'src', tsConfigPath: 'tsconfig.json', exclude: ['**/*.test.*', '**/*.spec.*'], outputDir: 'docs/architecture' } satisfies Partial<ArchDiagramConfig>;
    ```

  **Must NOT do**:
  - Don't use yargs/commander — simple process.argv parsing (already implemented in Task 3)
  - Don't add to CI yet (Task 21)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Thin entry point wiring — most logic already in pipeline orchestrator
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 20, 21)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 21, F1-F4
  - **Blocked By**: Tasks 3, 18

  **References**:
  - `scripts/analyze-component-patterns.ts` — follow this script's structure (shebang, async main, error handling)
  - `scripts/archdiagram/config.ts` — config loading from Task 3
  - `scripts/archdiagram/index.ts` — pipeline from Task 18
  - `package.json` scripts section — add `docs:diagram*` entries

  **Acceptance Criteria**:
  - [ ] `npm run docs:diagram -- --help` → prints usage, exits 0
  - [ ] `npm run docs:diagram:static` → runs static pipeline, exits 0
  - [ ] `archdiagram.config.ts` at project root is valid TypeScript
  - [ ] `npm run docs:diagram:static` produces files in `docs/architecture/`

  **QA Scenarios**:
  ```
  Scenario: npm run docs:diagram:static produces output
    Tool: Bash
    Steps:
      1. Run: npm run docs:diagram:static
      2. Assert exit code 0
      3. Assert docs/architecture/system-overview.excalidraw exists
      4. Assert docs/architecture/system-overview.md exists
    Expected Result: Diagrams generated via npm script
    Evidence: .sisyphus/evidence/task-19-npm-script.txt

  Scenario: Help flag shows usage
    Tool: Bash
    Steps:
      1. Run: npm run docs:diagram -- --help
      2. Assert output contains "--mode"
      3. Assert output contains "--src-dir"
      4. Assert exit code 0
    Expected Result: Usage information displayed
    Evidence: .sisyphus/evidence/task-19-help.txt
  ```

  **Commit**: YES (groups with Tasks 18, 20, 21)

- [x] 20. Claude Code Skill Instructions

  **What to do**:
  - Create `.claude/skills/archdiagram-skill/SKILL.md` — instructions for Claude Code interactive mode:
    - **When to use**: "Generate architecture diagram", "show me the codebase architecture", "create system overview"
    - **Prerequisites**: Excalidraw canvas running on port 3111 (start with `~/.local/share/mcp-servers/start-excalidraw-canvas.sh`)
    - **Workflow**:
      1. Run static analysis: `npx tsx scripts/generate-architecture-diagram.ts --mode static --phase analyze-only --output-dir /tmp/archdiagram`
      2. Read the analysis output: `/tmp/archdiagram/analysis.json`
      3. YOU (Claude) reason about architecture: Read the import graph, classify modules by purpose, identify architectural layers
      4. Generate Mermaid diagram from your understanding
      5. Use `create_from_mermaid` MCP tool to render to canvas
      6. Use `get_canvas_screenshot` to verify the result
      7. Use `export_scene` to save as .excalidraw JSON to `docs/architecture/`
      8. Use `export_to_excalidraw_url` to generate shareable link
    - **Alternative** (full headless): `npm run docs:diagram:full` (requires ANTHROPIC_API_KEY)
    - **Customization**: Edit `archdiagram.config.ts` for project-specific settings
  - Include references section: link to config schema, pipeline docs, MCP tool list

  **Must NOT do**:
  - Don't duplicate pipeline logic in the skill — it delegates to the npm script for static analysis
  - Don't require API keys for the interactive mode — Claude Code IS the LLM

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation/instructions — clear, structured markdown for AI consumption
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Tasks 19, 21)
  - **Parallel Group**: Wave 5
  - **Blocks**: F1-F4
  - **Blocked By**: Task 18

  **References**:
  - `~/.local/share/mcp-servers/mcp_excalidraw/skills/excalidraw-skill/SKILL.md` — reference for skill file structure
  - `scripts/generate-architecture-diagram.ts` — the npm script the skill delegates to
  - MCP tools: `create_from_mermaid`, `batch_create_elements`, `get_canvas_screenshot`, `export_scene`, `export_to_excalidraw_url`

  **Acceptance Criteria**:
  - [ ] `.claude/skills/archdiagram-skill/SKILL.md` exists and is valid markdown
  - [ ] Skill references the correct npm script path
  - [ ] Skill includes MCP tool names for canvas rendering
  - [ ] Skill includes prerequisite: canvas must be running

  **QA Scenarios**:
  ```
  Scenario: Skill file is well-structured
    Tool: Bash
    Steps:
      1. Assert file exists: test -f .claude/skills/archdiagram-skill/SKILL.md
      2. Assert contains "generate-architecture-diagram" (script reference)
      3. Assert contains "create_from_mermaid" (MCP tool reference)
      4. Assert contains "3111" or "canvas" (prerequisite mention)
    Expected Result: Complete skill file with all required references
    Evidence: .sisyphus/evidence/task-20-skill.txt

  Scenario: No API key mentioned as requirement for interactive mode
    Tool: Bash
    Steps:
      1. grep -c "ANTHROPIC_API_KEY.*required" .claude/skills/archdiagram-skill/SKILL.md
      2. Assert count is 0 in the interactive mode section
    Expected Result: Interactive mode documented as zero-key
    Evidence: .sisyphus/evidence/task-20-no-key-required.txt
  ```

  **Commit**: YES (groups with Tasks 18, 19, 21)

- [x] 21. CI Integration in docs-maintenance.yml

  **What to do**:
  - Add a step to `.github/workflows/docs-maintenance.yml`:
    - After existing Python docs steps, before git commit step
    - Setup Node.js 20 (if not already in workflow)
    - Run: `npm run docs:diagram:static` (static-only, no API key needed in CI)
    - The existing auto-commit step will pick up any generated/changed diagram files
  - Add generated diagram files to the gitignore exemption (if `docs/architecture/*.excalidraw` is gitignored)
  - Ensure `docs/architecture/` is included in the commit step's `git add` glob

  **Must NOT do**:
  - Don't use LLM mode in CI — static-only to avoid API key requirement and costs
  - Don't add new secrets to the workflow
  - Don't change the trigger conditions (push to docs/scripts + weekly schedule)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: YAML workflow edit — single step addition to existing workflow
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 19 for npm script)
  - **Parallel Group**: Wave 5 (after Task 19)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 19

  **References**:
  - `.github/workflows/docs-maintenance.yml` — existing workflow to extend
  - The workflow already has checkout, Python setup, and auto-commit steps

  **Acceptance Criteria**:
  - [ ] `docs-maintenance.yml` contains a `Generate architecture diagrams` step
  - [ ] The step runs `npm run docs:diagram:static`
  - [ ] Node.js 20 setup step present (if not already)
  - [ ] Workflow YAML is valid: `python -c "import yaml; yaml.safe_load(open('.github/workflows/docs-maintenance.yml'))"`

  **QA Scenarios**:
  ```
  Scenario: Workflow YAML is valid
    Tool: Bash
    Steps:
      1. Run: python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docs-maintenance.yml')); print('VALID')"
      2. Assert output contains "VALID"
    Expected Result: No YAML syntax errors
    Evidence: .sisyphus/evidence/task-21-yaml-valid.txt

  Scenario: Diagram step is in correct position
    Tool: Bash
    Steps:
      1. grep -n "Generate architecture" .github/workflows/docs-maintenance.yml
      2. Assert line number exists (step present)
      3. grep -n "git add\|git commit" .github/workflows/docs-maintenance.yml
      4. Assert diagram step line number < commit step line number
    Expected Result: Diagram generation runs before auto-commit
    Evidence: .sisyphus/evidence/task-21-step-order.txt
  ```

  **Commit**: YES (groups with Tasks 18, 19, 20)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npx vitest run` + `npx tsx --no-warnings scripts/generate-architecture-diagram.ts --mode static --dry-run`. Review all files in `scripts/archdiagram/` for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check for over-abstraction and generic naming.
  Output: `Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Run `npm run docs:diagram -- --mode static` on the foxpay codebase. Verify output files exist in `docs/architecture/`. Parse .excalidraw JSON — assert valid structure, node count > 0, no orphan nodes, all labels map to real directories. Parse Mermaid — assert valid syntax via `npx mmdc -i output.md -o /tmp/test.svg`. Run with `ANTHROPIC_API_KEY` if available. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual implementation. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance (no C4 L3, no monorepo, no plugin architecture). Detect unaccounted changes. Flag scope creep.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Commit 1**: `feat(archdiagram): add project scaffolding, types, config system, and test fixtures` — Tasks 1-4
- **Commit 2**: `feat(archdiagram): add static analysis phase (dependency-cruiser + ts-morph + barrel resolution)` — Tasks 5-8
- **Commit 3**: `feat(archdiagram): add LLM reasoning phase (prompts, API adapter, validation, orchestrator)` — Tasks 9-12
- **Commit 4**: `feat(archdiagram): add ELK.js layout engine` — Task 13
- **Commit 5**: `feat(archdiagram): add rendering phase (Excalidraw JSON, Mermaid, MCP canvas, SVG/PNG)` — Tasks 14-17
- **Commit 6**: `feat(archdiagram): add pipeline orchestrator, npm script, Claude Code skill, CI integration` — Tasks 18-21
- Pre-commit for each: `npx vitest run`

---

## Success Criteria

### Verification Commands
```bash
# Static-only mode produces output
npx tsx scripts/generate-architecture-diagram.ts --mode static
test -f docs/architecture/system-overview.excalidraw && echo "PASS"
test -f docs/architecture/system-overview.md && echo "PASS"

# All tests pass
npx vitest run --reporter=verbose

# Performance: static mode <30s
time npx tsx scripts/generate-architecture-diagram.ts --mode static

# Memory: stays under 512MB
node --max-old-space-size=512 ./node_modules/.bin/tsx scripts/generate-architecture-diagram.ts --mode static

# Mermaid output is valid
npx mmdc -i docs/architecture/system-overview.md -o /tmp/test-diagram.svg

# .excalidraw JSON is valid (parseable, has elements)
node -e "const d=JSON.parse(require('fs').readFileSync('docs/architecture/system-overview.excalidraw','utf8'));console.log(d.elements.length+' elements');process.exit(d.elements.length>0?0:1)"

# No hallucinated nodes (all labels map to real paths)
npx tsx scripts/generate-architecture-diagram.ts --mode static --validate-only
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All vitest tests pass
- [ ] Static-only mode works without API key
- [ ] Output opens in excalidraw.com
- [ ] Mermaid renders in GitHub preview
- [ ] Performance <30s on foxpay codebase
- [ ] Memory <512MB on foxpay codebase
