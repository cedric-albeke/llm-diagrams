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
| Canvas | Live render | Pushes to Excalidraw MCP canvas (port 3111) |
| SVG/PNG | `system-overview.svg/.png` | Via mermaid-cli or canvas export |

## Quick start

```bash
# Install
npm install

# Generate diagrams (no API key needed)
npm run docs:diagram:static

# Generate diagrams using Claude subscription auth (via local Claude environment)
npm run docs:diagram:subscription

# With LLM-enriched grouping
ANTHROPIC_API_KEY=sk-... npm run docs:diagram:full

# Point at a specific directory
npx tsx scripts/generate-architecture-diagram.ts --mode static --src-dir src --output-dir docs/architecture
```

## Usage

```
npx tsx scripts/generate-architecture-diagram.ts [options]

Options:
  --help              Show help
  --mode              static|full|subscription|auto (default: auto)
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
- **`auto`** (default) — Uses LLM if `ANTHROPIC_API_KEY` is set, otherwise falls back to static.

### OpenCode usage (outside Claude Code)

OpenCode can run all three modes directly from terminal/task runners:

```bash
# deterministic, no auth
npm run docs:diagram:static

# API-key backed
ANTHROPIC_API_KEY=sk-... npm run docs:diagram:full

# subscription-backed local auth context
npm run docs:diagram:subscription
```

Recommended in OpenCode automation:
- Use `static` in CI and bots.
- Use `full` for repeatable headless LLM output.
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
│   ├── reason.ts         # LLM prompts, API adapter, 6-layer validation
│   └── layout.ts         # ELK.js positioning
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
npm test                    # Run all 145 tests
npx vitest run --reporter=verbose  # Verbose output
```

## Requirements

- Node.js 20+
- TypeScript project with a `tsconfig.json`
- Single tsconfig (monorepo/multi-tsconfig support planned for v2)

## License

MIT
