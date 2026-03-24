# llm-diagrams

Automated architecture diagram generator for TypeScript codebases. Analyzes your source code via static analysis, optionally enriches it with LLM reasoning, computes a clean layout, and renders publication-quality diagrams in multiple formats.

## How it works

```
Source Code ──> Static Analysis ──> LLM Reasoning ──> ELK Layout ──> Rendering
               (dep-cruiser)       (optional)        (layered)      (multi-format)
               (ts-morph)
```

**Phase 1 — Analyze**: Extracts the import graph using [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), enriches modules with export metadata via [ts-morph](https://github.com/dsherret/ts-morph), and resolves barrel exports so `index.ts` files don't become mega-hub nodes.

**Phase 2 — Reason**: Groups files into architectural modules. In static mode, groups by directory. With an Anthropic API key, uses a two-agent LLM pattern (File Analyst + Architect) with 6-layer hallucination prevention to produce semantic groupings like "Payment Processing" instead of "Services".

**Phase 3 — Layout**: Computes non-overlapping positions using [ELK.js](https://github.com/kieler/elkjs) with layered algorithm and orthogonal edge routing.

**Phase 4 — Render**: Outputs to multiple formats simultaneously.

## Output formats

| Format | File | Description |
|--------|------|-------------|
| Excalidraw | `system-overview.excalidraw` | Opens in [excalidraw.com](https://excalidraw.com), editable vector diagram |
| Mermaid | `system-overview.md` | Renders in GitHub/GitLab markdown preview |
| Canvas | Live render | Pushes to Excalidraw MCP canvas (port 3444) |
| SVG/PNG | `system-overview.svg/.png` | Via mermaid-cli or canvas export |

## Quick start

```bash
# Install
npm install

# Generate diagrams (no API key needed)
npm run docs:diagram:static

# Generate diagrams using Claude subscription auth (via local Claude environment)
npm run docs:diagram:subscription

# With LLM-enriched grouping (Anthropic API key)
ANTHROPIC_API_KEY=sk-... npm run docs:diagram:full

# Via OpenAI
OPENAI_API_KEY=sk-... npm run docs:diagram:openai

# Via OpenRouter (access any model)
OPENROUTER_API_KEY=sk-or-... npm run docs:diagram:openrouter

# Via llmapi.ai
LLMAPI_API_KEY=... npm run docs:diagram:llmapi

# Point at a specific directory
npx tsx scripts/generate-architecture-diagram.ts --mode static --src-dir src --output-dir docs/architecture
```

## Usage

```
npx tsx scripts/generate-architecture-diagram.ts [options]

Options:
  --help              Show help
  --mode              static|full|subscription|openai|openrouter|llmapi|auto (default: auto)
  --src-dir           Source directory (default: src)
  --output-dir        Output directory (default: docs/architecture)
  --exclude           Comma-separated patterns to exclude
  --dry-run           Run pipeline without writing files
  --validate-only     Run analysis only, verify no hallucinated nodes
```

### Modes

- **`static`** — No API key required. Groups modules by directory structure. Fast and deterministic.
- **`full`** — Requires `ANTHROPIC_API_KEY`. Uses LLM to create semantic module groupings with descriptions and relationship labels.
- **`subscription`** — Uses your local Claude Code login (`claude -p`) as the reasoning backend (no API key). This avoids direct OAuth API calls and is best for local interactive usage.
- **`openai`** — Requires `OPENAI_API_KEY`. Uses OpenAI chat completions API (default model: `gpt-4o`).
- **`openrouter`** — Requires `OPENROUTER_API_KEY`. Routes through [OpenRouter](https://openrouter.ai) to access any supported model (default: `anthropic/claude-sonnet-4-20250514`).
- **`llmapi`** — Requires `LLMAPI_API_KEY`. Uses [llmapi.ai](https://llmapi.ai) gateway (default model: `gpt-4o`).
- **`auto`** (default) — Uses LLM if `ANTHROPIC_API_KEY` is set, otherwise falls back to static.

### OpenCode usage (outside Claude Code)

OpenCode can run all modes directly from terminal/task runners:

```bash
npm run docs:diagram:static                                      # no auth
ANTHROPIC_API_KEY=sk-... npm run docs:diagram:full               # Anthropic API
npm run docs:diagram:subscription                                # Claude login
OPENAI_API_KEY=sk-... npm run docs:diagram:openai                # OpenAI
OPENROUTER_API_KEY=sk-or-... npm run docs:diagram:openrouter     # OpenRouter
LLMAPI_API_KEY=... npm run docs:diagram:llmapi                   # llmapi.ai
```

Recommended in OpenCode automation:
- Use `static` in CI and bots.
- Use `full` or `openai` for repeatable headless LLM output.
- Use `openrouter` for model flexibility (route to any provider).
- Use `subscription` for local interactive workflows where Claude account auth is available (`claude login` done).

### Subscription mode prerequisites

`subscription` mode relies on the local Claude CLI session, not direct API-key auth.

```bash
claude login
npm run docs:diagram:subscription
```

If Claude CLI is not authenticated, the pipeline automatically falls back to static grouping.

Why this mode exists:
- Direct OAuth token usage against the standard Messages API path can fail with authentication errors.
- `subscription` mode avoids that path by delegating reasoning calls to your authenticated local `claude` CLI session.

For complete auth setup and troubleshooting, see [`docs/AUTHENTICATION.md`](./docs/AUTHENTICATION.md).

## Configuration

Create `archdiagram.config.ts` at your project root:

```typescript
import type { ArchDiagramConfig } from './scripts/archdiagram/types.js'

export default {
  srcDir: 'src',
  tsConfigPath: 'tsconfig.json',
  exclude: ['node_modules', 'dist'],
  outputDir: 'docs/architecture',
} satisfies Partial<ArchDiagramConfig>
```

CLI flags override config file values.

## Claude Code integration

When using [Claude Code](https://docs.anthropic.com/en/docs/claude-code), this project includes an interactive skill at `.claude/skills/archdiagram-skill/SKILL.md` that lets Claude:

1. Run static analysis on your codebase
2. Reason about the architecture directly (no API key needed — Claude IS the LLM)
3. Generate a Mermaid diagram
4. Render it to the Excalidraw canvas via MCP tools
5. Export as `.excalidraw` JSON and shareable URL

## CI integration

The included GitHub Actions workflow (`.github/workflows/docs-maintenance.yml`) automatically regenerates diagrams on pushes to `docs/` or `scripts/`, and weekly on Sunday.

## Architecture

```
scripts/archdiagram/
├── types.ts              # All pipeline interfaces
├── config.ts             # Config loading, CLI parsing, validation
├── phases/
│   ├── analyze.ts        # dep-cruiser + ts-morph extraction
│   ├── reason.ts         # LLM prompts, validation, orchestration
│   ├── layout.ts         # ELK.js positioning
│   └── llm/              # Provider adapters
│       ├── anthropic-api-adapter.ts
│       ├── claude-subscription-adapter.ts
│       ├── openai-compatible-adapter.ts  # OpenAI, OpenRouter, llmapi.ai
│       └── index.ts      # Adapter selector
├── renderers/
│   ├── excalidraw.ts     # .excalidraw JSON generation
│   ├── mermaid.ts        # Mermaid markdown generation
│   ├── canvas.ts         # Live canvas via REST API
│   └── image.ts          # SVG/PNG via mermaid-cli
├── utils/
│   ├── barrel-resolver.ts # Inline barrel re-export edges
│   └── graph-utils.ts     # Merge + enrich import graph
└── index.ts              # Pipeline orchestrator
```

## Testing

```bash
npm test                    # Run all tests
npx vitest run --reporter=verbose  # Verbose output
```

## Requirements

- Node.js 20+
- TypeScript project with a `tsconfig.json`
- Single tsconfig (monorepo/multi-tsconfig support planned for v2)

## TUI (Interactive Mode)

Launch the interactive terminal UI:

```bash
npm run tui
```

### Features

- **Wizard flow**: step-by-step provider selection → config editing → format picker → confirmation
- **Live dashboard**: real-time progress for all 4 pipeline phases (analyze, reason, layout, render)
- **Post-run preview**: Mermaid diagram text preview directly in terminal
- **Config save**: optionally persist settings to `archdiagram.config.ts`

### Screenshot

```
╭─────────────────────────────────────────────────────╮
│ llm-diagrams — Architecture Diagram Generator       │
╰─────────────────────────────────────────────────────╯
  Welcome! Generate an architecture diagram for your
  TypeScript project.

  > Start wizard
    Quick run (static mode)
    Quit
```

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate options |
| `Enter` | Select / confirm |
| `Space` | Toggle checkbox |
| `Escape` | Go back |
| `q` | Quit (from any screen except during pipeline execution) |

### Requirements

- Node.js 20+
- TypeScript project with `tsconfig.json`
- For `full` / `openai` / `openrouter` / `llmapi` modes: respective API key in environment
- For `subscription` mode: `claude login` completed

### Non-interactive / CI mode

```bash
npm run tui -- --no-interactive   # exits immediately with code 0
npm run tui -- --help             # show help and exit
```

## License

MIT
