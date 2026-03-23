# Authentication Modes

`llm-diagrams` supports three authentication/LLM execution modes:

## 1) Static mode (no auth)

```bash
npm run docs:diagram:static
```

- No API key required
- No Claude login required
- Uses deterministic directory-based grouping
- Recommended for CI and reproducible automation

## 2) API key mode (Anthropic API)

```bash
export ANTHROPIC_API_KEY="sk-ant-api..."
npm run docs:diagram:full
```

- Uses `@anthropic-ai/sdk`
- Best for headless/server environments
- Recommended for production automation with predictable behavior

## 3) Subscription mode (Claude Max / Claude Code login)

```bash
claude login
npm run docs:diagram:subscription
```

- Uses your local authenticated `claude` CLI session
- Does **not** require `ANTHROPIC_API_KEY`
- Best for local developer workflows (OpenCode, terminal sessions)

## OpenCode usage

In OpenCode environments, choose mode by context:

- CI/bot runs: `static`
- Headless LLM runs: `full`
- Local interactive with Claude subscription: `subscription`

Example:

```bash
# local interactive, authenticated via Claude login
claude login
npm run docs:diagram:subscription
```

## Troubleshooting

### "OAuth authentication is currently not supported"

This appears when direct OAuth token usage hits an unsupported API auth path.

Use:

```bash
npm run docs:diagram:subscription
```

This mode delegates LLM reasoning through local `claude` CLI auth context instead of direct API-key style requests.

### Subscription mode still fails

1. Re-authenticate:
   ```bash
   claude login
   ```
2. Verify CLI works:
   ```bash
   claude -p "Respond with exactly: OK" --output-format text
   ```
3. Retry:
   ```bash
   npm run docs:diagram:subscription
   ```

### Need guaranteed headless reliability

Use API key mode:

```bash
export ANTHROPIC_API_KEY="sk-ant-api..."
npm run docs:diagram:full
```
