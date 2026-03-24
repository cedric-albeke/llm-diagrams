# CLI TUI for llm-diagrams

## TL;DR

> **Quick Summary**: Build a full terminal UI with Ink 6/React 19 that wraps the existing diagram pipeline — wizard for config, live dashboard during execution, Mermaid preview + output summary after.
> 
> **Deliverables**:
> - Pipeline infrastructure: format filtering + progress callbacks
> - Config serializer for write-back to `archdiagram.config.ts`
> - Ink-based TUI with 7 screens: Welcome, Provider Select, Config Editor, Format Filter, Confirm, Dashboard, Results
> - Mermaid text preview in terminal post-generation
> - `npm run tui` entry point
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 (format filter) + T2 (progress) → T4 (Ink scaffold) → T6-T10 (screens) → T11 (entry point)

---

## Context

### Original Request
Build a full CLI TUI for the llm-diagrams architecture diagram generator.

### Interview Summary
**Key Discussions**:
- TUI purpose: wizard (guided setup) + dashboard (live execution) — confirmed "both"
- Diagram preview: Mermaid text preview (ASCII box-drawing deemed too risky per Metis review)
- Config depth: full interactive editor for all settings
- Framework: Ink 6 with React 19 — confirmed by user
- Format filtering: yes, with multi-select in TUI — requires pipeline change
- Config persistence: save edited config back to archdiagram.config.ts

**Research Findings**:
- Pipeline API: `runPipeline(ArchDiagramConfig, PipelineOptions) -> PipelineResult` — no progress hooks exist today
- 6 LLM providers: none, anthropic, claude-subscription, openai, openrouter, llmapi
- `OutputFormat` type + `RenderOptions` type exist in types.ts but are never wired
- `--format` flag is parsed but silently dropped
- SVG/PNG depend on mermaid output file path — implicit dependency chain
- Ink 6: native ESM, flexbox via yoga-layout, React 19 concurrent rendering
- @inkjs/ui: SelectInput, TextInput, Spinner, ProgressBar, ConfirmInput

### Metis Review
**Identified Gaps** (addressed):
- Pipeline has ZERO progress reporting — adding `onProgress` callback (phase-level only)
- Format filtering is dead infrastructure — wiring it properly
- SVG/PNG depend on mermaid intermediate — auto-including when needed
- No JSX/TSX in tsconfig — separate `tsconfig.tui.json`
- Config write-back requires TS codegen — template-string serialization with round-trip validation
- API keys must NEVER be written to config file
- render.ts is empty stub — format filtering goes in index.ts orchestrator
- Canvas renderer depends on external server — include with auto-detection/warning

---

## Work Objectives

### Core Objective
Add a full terminal UI that lets users interactively configure and run the architecture diagram pipeline with live progress feedback and output preview.

### Concrete Deliverables
- `scripts/archdiagram/tui/` — Ink-based TUI module (7 screens + shell)
- `scripts/archdiagram/config-serializer.ts` — config write-back
- Modified `scripts/archdiagram/index.ts` — format filter + progress callback
- `tsconfig.tui.json` — JSX support for TUI files
- `tests/tui/` — component tests
- `npm run tui` script

### Definition of Done
- [ ] `npm run tui` launches interactive TUI
- [ ] User can select provider, edit all config fields, pick output formats
- [ ] Live dashboard shows phase progress during pipeline execution
- [ ] Post-run shows Mermaid text preview and output file paths
- [ ] Config can be saved back to `archdiagram.config.ts`
- [ ] All existing tests still pass (`npx vitest run`)

### Must Have
- Wizard flow: Welcome → Provider → Config → Formats → Confirm → Run
- Live dashboard with 4 phase progress indicators
- Post-run Mermaid text preview (show file content)
- Output file list with paths
- Config save-to-file option
- Format selection (multi-select from: excalidraw, mermaid, svg, png, canvas)
- All 6 providers selectable in TUI

### Must NOT Have (Guardrails)
- No custom ASCII box-drawing diagram renderer (show Mermaid text instead)
- No pipeline cancellation/abort support in v1
- No sub-step progress (per-file, per-batch) — phase-level only
- No `.env` file loading or API key management in TUI
- No mouse support
- No API keys written to config file — ever
- No modification to existing renderer files (format filtering in orchestrator only)
- No modification to existing test files

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after for each task)
- **Framework**: vitest + `ink-testing-library` for React/Ink components

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/tui-task-{N}-{slug}.{ext}`.

- **Pipeline changes**: Use Bash (vitest) — run tests, assert pass counts
- **TUI components**: Use Bash (vitest + ink-testing-library) — render, assert text, simulate keys
- **Integration**: Use interactive_bash (tmux) — launch TUI, send keystrokes, capture output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Pipeline infrastructure — no UI deps, fully parallel):
├── Task 1: Add formats filter to PipelineOptions [quick]
├── Task 2: Add onProgress callback to PipelineOptions [quick]
├── Task 3: Add config serializer for write-back [quick]

Wave 2 (Ink scaffold — depends on nothing in Wave 1):
├── Task 4: Install Ink deps + tsconfig.tui.json + proof-of-concept [quick]
├── Task 5: App shell with screen routing + useScreen hook [unspecified-high]

Wave 3 (Screens — depends on Wave 2 shell, can use Wave 1 APIs):
├── Task 6: Welcome + Provider select screens [visual-engineering]
├── Task 7: Config editor screen [visual-engineering]
├── Task 8: Format filter + Confirm screens [visual-engineering]
├── Task 9: Dashboard screen with live progress [deep]
├── Task 10: Results screen with preview + config save [unspecified-high]

Wave 4 (Integration + docs):
├── Task 11: Entry point + npm script + README [quick]

Wave FINAL:
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
├── F4: Scope fidelity check (deep)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 (formats) | — | T8, T9 |
| T2 (progress) | — | T9 |
| T3 (serializer) | — | T10 |
| T4 (Ink scaffold) | — | T5 |
| T5 (App shell) | T4 | T6, T7, T8, T9, T10 |
| T6 (Welcome/Provider) | T5 | T11 |
| T7 (Config editor) | T5 | T11 |
| T8 (Format/Confirm) | T1, T5 | T11 |
| T9 (Dashboard) | T1, T2, T5 | T11 |
| T10 (Results) | T3, T5 | T11 |
| T11 (Entry point) | T6-T10 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 2 tasks — T4 `quick`, T5 `unspecified-high`
- **Wave 3**: 5 tasks — T6 `visual-engineering`, T7 `visual-engineering`, T8 `visual-engineering`, T9 `deep`, T10 `unspecified-high`
- **Wave 4**: 1 task — T11 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Add formats filter to PipelineOptions

  **What to do**:
  - Add `formats?: OutputFormat[]` to `PipelineOptions` in `scripts/archdiagram/index.ts`
  - Gate each renderer call behind `if (!formats || formats.includes('excalidraw'))` etc.
  - Handle SVG/PNG→mermaid dependency: if formats includes `svg` or `png` but not `mermaid`, auto-generate mermaid as hidden intermediate (run it, use the file, but don't include in `outputs` unless `mermaid` was explicitly requested)
  - Wire the existing dead `RenderOptions` type from `types.ts`
  - Add `tests/archdiagram/format-filter.test.ts`

  **Must NOT do**:
  - Don't modify individual renderer files — filtering happens in the orchestrator only
  - Don't change existing test files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: T8, T9
  - **Blocked By**: None

  **References**:
  - `scripts/archdiagram/index.ts:98-136` — current render block (all formats unconditional)
  - `scripts/archdiagram/types.ts:124-128` — `OutputFormat` type + `RenderOptions` interface (unused)
  - `scripts/archdiagram/renderers/image.ts:renderImage()` — takes mermaid file path as input (SVG/PNG dependency)
  - `tests/archdiagram/pipeline.test.ts` — existing pipeline test pattern

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/format-filter.test.ts` → PASS
  - [ ] Test: `formats: ['excalidraw']` produces only excalidraw output
  - [ ] Test: `formats: ['svg']` auto-generates mermaid intermediate and produces SVG
  - [ ] Test: `formats: undefined` (omitted) produces all formats (backward compatible)
  - [ ] Existing pipeline tests still pass: `npx vitest run tests/archdiagram/pipeline.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: Format filter produces only selected format
    Tool: Bash
    Steps:
      1. npx vitest run tests/archdiagram/format-filter.test.ts --reporter=verbose
      2. Assert exit code 0
      3. Assert output contains "Tests  X passed"
    Expected Result: All format-filter tests pass
    Evidence: .sisyphus/evidence/tui-task-1-format-filter.txt
  ```

  **Commit**: YES
  - Message: `feat(pipeline): add formats filter to PipelineOptions`
  - Files: `scripts/archdiagram/index.ts`, `tests/archdiagram/format-filter.test.ts`

---

- [x] 2. Add onProgress callback to PipelineOptions

  **What to do**:
  - Define `PipelineProgressEvent` type in `types.ts`: `{ phase: 'analyze' | 'reason' | 'layout' | 'render'; status: 'start' | 'complete' | 'error'; message?: string; duration?: number }`
  - Add `onProgress?: (event: PipelineProgressEvent) => void` to `PipelineOptions`
  - Fire `onProgress({ phase, status: 'start' })` before each phase block in `runPipeline`
  - Fire `onProgress({ phase, status: 'complete', duration })` after each phase succeeds
  - Fire `onProgress({ phase, status: 'error', message })` on phase failure
  - Add `tests/archdiagram/progress-callback.test.ts`

  **Must NOT do**:
  - No sub-step granularity (no per-file, per-batch events)
  - No cancelation/abort mechanism
  - Don't break existing callers (callback is optional)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: T9
  - **Blocked By**: None

  **References**:
  - `scripts/archdiagram/index.ts:19-50` — phase 1 block pattern (analyze)
  - `scripts/archdiagram/types.ts:130-143` — PhaseResult, PipelineResult types

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/progress-callback.test.ts` → PASS
  - [ ] Test: callback fires 4 'start' + 4 'complete' events for a full static run
  - [ ] Test: callback fires 'error' status when a phase fails
  - [ ] Test: omitting callback doesn't crash (backward compatible)
  - [ ] Existing tests pass: `npx vitest run tests/archdiagram/pipeline.test.ts`

  **QA Scenarios**:
  ```
  Scenario: Progress callback fires for all phases
    Tool: Bash
    Steps:
      1. npx vitest run tests/archdiagram/progress-callback.test.ts --reporter=verbose
      2. Assert exit code 0
    Expected Result: All progress-callback tests pass
    Evidence: .sisyphus/evidence/tui-task-2-progress-callback.txt
  ```

  **Commit**: YES
  - Message: `feat(pipeline): add onProgress callback to PipelineOptions`
  - Files: `scripts/archdiagram/types.ts`, `scripts/archdiagram/index.ts`, `tests/archdiagram/progress-callback.test.ts`

---

- [x] 3. Add config serializer for write-back

  **What to do**:
  - Create `scripts/archdiagram/config-serializer.ts` with `serializeConfig(config: ArchDiagramConfig): string`
  - Output valid TypeScript matching `archdiagram.config.ts` format: `import type` + `export default { ... } satisfies Partial<ArchDiagramConfig>`
  - Filter out `llm.apiKey` — NEVER write API keys to file
  - Filter out fields matching DEFAULT_CONFIG values (only persist overrides)
  - Add `saveConfig(config: ArchDiagramConfig, filePath: string): void` — writes serialized TS to file
  - Add round-trip test: serialize → write → import → deep-equal
  - Add `tests/archdiagram/config-serializer.test.ts`

  **Must NOT do**:
  - Never write `apiKey` to the file
  - Don't write a JSON sidecar — produce real TypeScript

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: T10
  - **Blocked By**: None

  **References**:
  - `archdiagram.config.ts` — target output format
  - `scripts/archdiagram/config.ts:44-65` — `loadConfigFile()` that reads the config back
  - `scripts/archdiagram/types.ts:166-173` — `ArchDiagramConfig` shape
  - `scripts/archdiagram/config.ts:5-20` — `DEFAULT_CONFIG` values

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/archdiagram/config-serializer.test.ts` → PASS
  - [ ] Test: serialized output does NOT contain `apiKey`
  - [ ] Test: round-trip: `loadConfigFile(saveConfig(config, path))` deep-equals original (minus apiKey)
  - [ ] Test: only non-default values are persisted

  **QA Scenarios**:
  ```
  Scenario: Config round-trip preserves values
    Tool: Bash
    Steps:
      1. npx vitest run tests/archdiagram/config-serializer.test.ts --reporter=verbose
      2. Assert exit code 0
    Expected Result: All serializer tests pass including round-trip
    Evidence: .sisyphus/evidence/tui-task-3-config-serializer.txt
  ```

  **Commit**: YES
  - Message: `feat(config): add config serializer for write-back`
  - Files: `scripts/archdiagram/config-serializer.ts`, `tests/archdiagram/config-serializer.test.ts`

---

- [x] 4. Install Ink deps + tsconfig.tui.json + proof-of-concept

  **What to do**:
  - `npm install --save-dev ink@6 react@19 react-dom@19 @inkjs/ui ink-testing-library`
  - Create `tsconfig.tui.json` extending base tsconfig, adding `"jsx": "react-jsx"`, `"jsxImportSource": "react"`
  - Create minimal `scripts/archdiagram/tui/index.tsx`: render `<Box><Text>llm-diagrams TUI</Text></Box>` and exit
  - Validate: `npx tsx scripts/archdiagram/tui/index.tsx` exits 0 and prints text

  **Must NOT do**:
  - Don't modify root `tsconfig.json`
  - Don't build screens yet — proof-of-concept only

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (parallel with Wave 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: T5
  - **Blocked By**: None

  **References**:
  - `tsconfig.json` — base config to extend
  - `package.json` — existing devDependencies pattern

  **Acceptance Criteria**:
  - [ ] `npx tsx scripts/archdiagram/tui/index.tsx` exits 0
  - [ ] Output contains "llm-diagrams TUI"
  - [ ] `npm ls ink react` shows installed versions
  - [ ] `tsconfig.tui.json` exists with jsx settings

  **QA Scenarios**:
  ```
  Scenario: Ink proof-of-concept renders and exits
    Tool: Bash
    Steps:
      1. npx tsx scripts/archdiagram/tui/index.tsx
      2. Assert exit code 0
      3. Assert stdout contains "llm-diagrams"
    Expected Result: Ink renders text to terminal and exits cleanly
    Evidence: .sisyphus/evidence/tui-task-4-ink-poc.txt
  ```

  **Commit**: YES
  - Message: `chore(tui): add Ink 6 + React 19 deps and proof-of-concept`
  - Files: `package.json`, `package-lock.json`, `tsconfig.tui.json`, `scripts/archdiagram/tui/index.tsx`

---

- [x] 5. App shell with screen routing

  **What to do**:
  - Create `scripts/archdiagram/tui/App.tsx` — main app component with screen state machine
  - Create `scripts/archdiagram/tui/hooks/useScreen.ts` — `useScreen()` hook returning `{screen, setScreen, config, setConfig}`
  - Screen enum: `'welcome' | 'provider' | 'config' | 'formats' | 'confirm' | 'dashboard' | 'results'`
  - App renders current screen component based on state
  - Keyboard: `q` or `Ctrl+C` to quit from any screen, `Escape` to go back
  - Create `tests/tui/app.test.tsx` using `ink-testing-library`

  **Must NOT do**:
  - Don't implement actual screen content yet — placeholder `<Text>` for each
  - No mouse support

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after T4
  - **Blocks**: T6, T7, T8, T9, T10
  - **Blocked By**: T4

  **References**:
  - `scripts/archdiagram/tui/index.tsx` — proof-of-concept entry point from T4
  - Ink docs: `useInput`, `useFocus`, `Box`, `Text` components

  **Acceptance Criteria**:
  - [ ] `npx vitest run tests/tui/app.test.tsx` → PASS
  - [ ] Test: App renders welcome screen by default
  - [ ] Test: screen transitions work (setScreen changes rendered content)
  - [ ] Test: `q` keypress triggers exit

  **QA Scenarios**:
  ```
  Scenario: App shell renders and transitions between screens
    Tool: Bash
    Steps:
      1. npx vitest run tests/tui/ --reporter=verbose
      2. Assert exit code 0
    Expected Result: All TUI shell tests pass
    Evidence: .sisyphus/evidence/tui-task-5-app-shell.txt
  ```

  **Commit**: YES
  - Message: `feat(tui): add App shell with screen routing`
  - Files: `scripts/archdiagram/tui/App.tsx`, `scripts/archdiagram/tui/hooks/useScreen.ts`, `tests/tui/app.test.tsx`

---

- [x] 6. Welcome + Provider select screens

  **What to do**:
  - Create `scripts/archdiagram/tui/screens/Welcome.tsx` — banner, version, key shortcuts, "Press Enter to start"
  - Create `scripts/archdiagram/tui/screens/ProviderSelect.tsx` — `SelectInput` from `@inkjs/ui` with all 6 providers, friendly labels + env var hints, auto-detect which env vars are set (show green checkmark)
  - Provider labels: `Static (no LLM)`, `Anthropic API`, `Claude Subscription`, `OpenAI`, `OpenRouter`, `llmapi.ai`
  - On select: set `config.llm.provider` and advance to config screen
  - Create `tests/tui/screens/welcome.test.tsx` + `tests/tui/screens/provider-select.test.tsx`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T7, T8)
  - **Blocks**: T11
  - **Blocked By**: T5

  **References**:
  - `scripts/archdiagram/types.ts:149` — `LLMProvider` union type
  - `@inkjs/ui` — `SelectInput` component API

  **Acceptance Criteria**:
  - [ ] Tests pass: `npx vitest run tests/tui/screens/`
  - [ ] Welcome screen renders app name
  - [ ] Provider select shows all 6 options

  **Commit**: YES
  - Message: `feat(tui): add Welcome and Provider select screens`

---

- [x] 7. Config editor screen

  **What to do**:
  - Create `scripts/archdiagram/tui/screens/ConfigEditor.tsx`
  - Editable fields: srcDir, tsConfigPath, outputDir, exclude (comma-separated), model, temperature, style.direction (toggle RIGHT/DOWN), style.fontSize
  - Use `TextInput` from `@inkjs/ui` for string fields, custom toggle for direction
  - Show current values from config, highlight changed fields
  - Navigation: up/down arrows between fields, Enter to edit, Escape to finish
  - Run `validateConfig()` on finish — show errors inline if any
  - Create `tests/tui/screens/config-editor.test.tsx`

  **Must NOT do**:
  - Don't show apiKey field (env var only)
  - Don't show baseUrl field (advanced — config file only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T11
  - **Blocked By**: T5

  **References**:
  - `scripts/archdiagram/config.ts:5-20` — DEFAULT_CONFIG shape
  - `scripts/archdiagram/config.ts:143-164` — `validateConfig()`
  - `@inkjs/ui` — `TextInput`, `ConfirmInput`

  **Acceptance Criteria**:
  - [ ] Tests pass: `npx vitest run tests/tui/screens/config-editor.test.tsx`
  - [ ] All editable fields render with current values
  - [ ] Validation errors display when srcDir is invalid

  **Commit**: YES
  - Message: `feat(tui): add Config editor screen`

---

- [x] 8. Format filter + Confirm screens

  **What to do**:
  - Create `scripts/archdiagram/tui/screens/FormatFilter.tsx` — multi-select from OutputFormat values: excalidraw, mermaid, canvas, svg, png. Default all checked. Show dependency note: "SVG/PNG require Mermaid (auto-included)"
  - Create `scripts/archdiagram/tui/screens/Confirm.tsx` — summary of all config choices + selected formats. "Press Enter to run" / "Press Escape to go back"
  - Canvas option: show "(requires canvas on port 3111)" hint
  - Create tests for both screens

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: T11
  - **Blocked By**: T1, T5

  **References**:
  - `scripts/archdiagram/types.ts:124` — `OutputFormat` type
  - T1's format filter implementation

  **Acceptance Criteria**:
  - [ ] Tests pass for both screens
  - [ ] Format multi-select shows all 5 format options
  - [ ] Confirm screen shows config summary

  **Commit**: YES
  - Message: `feat(tui): add Format filter and Confirm screens`

---

- [x] 9. Dashboard screen with live pipeline progress

  **What to do**:
  - Create `scripts/archdiagram/tui/screens/Dashboard.tsx`
  - Show 4 phase rows: analyze, reason, layout, render
  - Each row: phase name + status indicator (waiting/spinner/checkmark/error) + duration
  - Wire `onProgress` callback from T2 to update state via `useState`
  - Call `runPipeline(config, { formats, onProgress })` when dashboard mounts
  - On pipeline complete: auto-transition to results screen
  - Create `tests/tui/screens/dashboard.test.tsx`

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T10)
  - **Parallel Group**: Wave 3
  - **Blocks**: T11
  - **Blocked By**: T1, T2, T5

  **References**:
  - T2's `onProgress` callback + `PipelineProgressEvent` type
  - T1's `formats` filter in PipelineOptions
  - `@inkjs/ui` — `Spinner` component

  **Acceptance Criteria**:
  - [ ] Tests pass: `npx vitest run tests/tui/screens/dashboard.test.tsx`
  - [ ] Dashboard renders 4 phase rows
  - [ ] Progress events update phase status indicators

  **Commit**: YES
  - Message: `feat(tui): add Dashboard with live pipeline progress`

---

- [x] 10. Results screen with preview + config save

  **What to do**:
  - Create `scripts/archdiagram/tui/screens/Results.tsx`
  - Show: pipeline duration, phase results (checkmark/X per phase)
  - Show: output file list with format labels and paths
  - Show: Mermaid text preview — read the `.md` output file content and display in a scrollable `<Box>`
  - Show: "Save config?" prompt using `ConfirmInput` — calls `saveConfig()` from T3
  - Show: "Press q to exit" at bottom
  - Create `tests/tui/screens/results.test.tsx`

  **Must NOT do**:
  - No ASCII box-drawing diagram (show Mermaid text instead)
  - Never write apiKey to config file (T3 handles this)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T9)
  - **Parallel Group**: Wave 3
  - **Blocks**: T11
  - **Blocked By**: T3, T5

  **References**:
  - T3's `saveConfig()` function
  - `scripts/archdiagram/types.ts:135-143` — `PipelineResult`, `RenderResult`

  **Acceptance Criteria**:
  - [ ] Tests pass: `npx vitest run tests/tui/screens/results.test.tsx`
  - [ ] Results screen shows phase durations
  - [ ] Output file paths displayed
  - [ ] Config save prompt works

  **Commit**: YES
  - Message: `feat(tui): add Results screen with output list and config save`

---

- [x] 11. Entry point + npm script + README

  **What to do**:
  - Update `scripts/archdiagram/tui/index.tsx` from proof-of-concept to full App render
  - Add `"tui": "tsx scripts/archdiagram/tui/index.tsx"` to package.json scripts
  - Update README.md with TUI section: usage, screenshot placeholder, feature list
  - Verify: `npm run tui` launches the TUI

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential after all screens)
  - **Blocks**: F1-F4
  - **Blocked By**: T6-T10

  **References**:
  - All screen components from T6-T10
  - `scripts/archdiagram/tui/App.tsx` from T5

  **Acceptance Criteria**:
  - [ ] `npm run tui` exits 0 (non-interactive smoke test)
  - [ ] README contains TUI usage section
  - [ ] `npx vitest run` — all tests pass (existing + new)

  **Commit**: YES
  - Message: `feat: add npm script 'tui' entry point and update README`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
- [x] F2. **Code Quality Review** — `unspecified-high`
- [x] F3. **Real Manual QA** — `unspecified-high`
- [x] F4. **Scope Fidelity Check** — `deep`

---

## Commit Strategy

| Task | Message |
|------|---------|
| T1 | `feat(pipeline): add formats filter to PipelineOptions` |
| T2 | `feat(pipeline): add onProgress callback to PipelineOptions` |
| T3 | `feat(config): add config serializer for write-back` |
| T4 | `chore(tui): add Ink 6 + React 19 deps and proof-of-concept` |
| T5 | `feat(tui): add App shell with screen routing` |
| T6 | `feat(tui): add Welcome and Provider select screens` |
| T7 | `feat(tui): add Config editor screen` |
| T8 | `feat(tui): add Format filter and Confirm screens` |
| T9 | `feat(tui): add Dashboard with live pipeline progress` |
| T10 | `feat(tui): add Results screen with output list and config save` |
| T11 | `feat: add npm script 'tui' entry point and update README` |

---

## Success Criteria

### Verification Commands
```bash
npm run tui                          # Launches interactive TUI
npx vitest run                       # All tests pass (existing + new)
npx vitest run tests/tui/            # All TUI component tests pass
npx vitest run tests/archdiagram/    # All pipeline tests pass (including new format-filter + progress)
```

### Final Checklist
- [ ] All "Must Have" features present
- [ ] All "Must NOT Have" guardrails respected
- [ ] All tests pass (existing 159 + new TUI tests)
- [ ] `npm run tui` works end-to-end

</content>
</invoke>