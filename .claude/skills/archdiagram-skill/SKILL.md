# Architecture Diagram Generator Skill

## When to Use

Use this skill when the user asks to:
- "Generate architecture diagram"
- "Show me the codebase architecture"
- "Create a system overview diagram"
- "Draw the component relationships"
- "Map out how the modules connect"

## Prerequisites

1. Excalidraw canvas must be running on port 3444:
   ```bash
   ~/.local/share/mcp-servers/start-excalidraw-canvas.sh
   ```
2. You are working in a TypeScript project with a `tsconfig.json`

## Interactive Mode Workflow (Zero API Keys Required)

This mode uses YOU (Claude Code) as the reasoning engine instead of the Anthropic API. No `ANTHROPIC_API_KEY` needed.

### Step 1: Analyze the Codebase

Read the source directory structure to understand what you're working with:

```bash
find src -name "*.ts" | head -30
```

Then read key files to understand the major subsystems. Look for:
- Entry points (`index.ts`, `main.ts`, `app.ts`)
- Feature directories and their responsibilities
- Shared utilities and how they're consumed
- External integrations (APIs, databases, queues)

You can also run static analysis to extract the import graph:

```bash
npx tsx scripts/generate-architecture-diagram.ts --mode static --validate-only --src-dir src
```

### Step 2: Reason About Architecture

YOU (Claude Code) analyze what you've read:
- Identify major subsystems and their responsibilities
- Group files by feature/domain, not by layer (avoid "components/services/utils" groupings)
- Identify key data flows and relationships between subsystems
- Note external dependencies and integration points

### Step 3: Generate Mermaid Diagram

Create a Mermaid diagram based on your analysis. Use `graph LR` for left-to-right flow, `graph TD` for top-down:

```
graph LR
  subgraph auth["Authentication"]
    login["Login Flow"]
    session["Session Mgmt"]
  end
  subgraph payments["Payments"]
    checkout["Checkout"]
    billing["Billing"]
  end
  auth -->|"user context"| payments
```

Keep it readable: 5-15 nodes is usually the right level of abstraction. Don't map every file.

### Step 4: Render to Canvas via MCP

Use the `create_from_mermaid` MCP tool with your Mermaid diagram string. The canvas must be running on port 3444 for this to work.

### Step 5: Verify and Export

1. Use `get_canvas_screenshot` to visually verify the diagram looks correct
2. Use `export_scene` to save as `.excalidraw` JSON to `docs/architecture/system-overview.excalidraw`
3. Use `export_to_excalidraw_url` to generate a shareable link anyone can open
4. Save the Mermaid source to `docs/architecture/system-overview.md` for version control

## Headless Mode (With API Key)

For automated or CI generation where Claude Code isn't available:

```bash
ANTHROPIC_API_KEY=sk-... npm run docs:diagram:full
```

This runs the full pipeline: static analysis, LLM reasoning via API, Mermaid generation, and canvas rendering.

## OpenCode Usage (Outside Claude Code)

When running from OpenCode tasks or terminal sessions, use one of these:

```bash
# deterministic, no auth
npm run docs:diagram:static

# API-key backed LLM reasoning
ANTHROPIC_API_KEY=sk-... npm run docs:diagram:full

# Claude subscription-backed local auth context (uses local Claude CLI login)
npm run docs:diagram:subscription
```

Guidance:
- Prefer `static` for CI/bot workflows.
- Prefer `full` for reproducible headless LLM output.
- Prefer `subscription` for local interactive sessions where Claude subscription auth is available (`claude login` completed).

## Static Mode (No API Key, No Canvas)

For basic diagram generation without AI reasoning:

```bash
npm run docs:diagram:static
```

Outputs: `docs/architecture/system-overview.excalidraw` and `docs/architecture/system-overview.md`

This uses heuristic grouping based on directory structure. Results are less semantically meaningful than the interactive or headless modes.

## Configuration

Edit `archdiagram.config.ts` at the project root to customize behavior:

| Field | Description | Default |
|-------|-------------|---------|
| `srcDir` | Source directory to analyze | `src` |
| `tsConfigPath` | TypeScript config path | `tsconfig.json` |
| `exclude` | Patterns to exclude from analysis | `[]` |
| `outputDir` | Where to save generated diagrams | `docs/architecture` |

## MCP Tools Reference

These tools are available when the Excalidraw canvas is running on port 3444:

| Tool | Purpose |
|------|---------|
| `create_from_mermaid` | Render a Mermaid diagram string to the canvas |
| `get_canvas_screenshot` | Capture the current canvas state as an image |
| `export_scene` | Save the canvas as a `.excalidraw` JSON file |
| `export_to_excalidraw_url` | Generate a shareable excalidraw.com URL |
| `batch_create_elements` | Add multiple elements to the canvas at once |
| `clear_canvas` | Clear all elements before rendering a fresh diagram |

## Troubleshooting

**Canvas not responding**: Make sure the canvas is running. Check with `curl http://localhost:3444` or restart with `~/.local/share/mcp-servers/start-excalidraw-canvas.sh`.

**Mermaid parse error**: Validate your Mermaid syntax at https://mermaid.live before passing to `create_from_mermaid`.

**Diagram too cluttered**: Raise the abstraction level. Merge related files into a single node. Aim for subsystems, not individual files.

**Static analysis fails**: Make sure `tsconfig.json` exists and `src/` is the correct source directory. Pass `--src-dir` to override.

**Subscription mode returns auth/API errors**: Ensure `claude login` has been completed and run `npm run docs:diagram:subscription` again. Subscription mode uses local Claude CLI auth context.
