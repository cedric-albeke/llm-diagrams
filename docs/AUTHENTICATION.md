# Authentication Modes

`llm-diagrams` supports six LLM provider modes:

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

## 4) OpenAI mode

```bash
export OPENAI_API_KEY="sk-..."
npm run docs:diagram:openai
```

- Uses OpenAI chat completions API (`/v1/chat/completions`)
- Default model: `gpt-4o`
- Override model: set `model` in `archdiagram.config.ts` or pass via config

## 5) OpenRouter mode

```bash
export OPENROUTER_API_KEY="sk-or-..."
npm run docs:diagram:openrouter
```

- Routes through [OpenRouter](https://openrouter.ai) to any supported model
- Default model: `anthropic/claude-sonnet-4-20250514`
- Sends `HTTP-Referer` and `X-Title` headers per OpenRouter requirements

## 6) llmapi.ai mode

```bash
export LLMAPI_API_KEY="..."
npm run docs:diagram:llmapi
```

- Uses [llmapi.ai](https://llmapi.ai) gateway (`/v1/chat/completions`)
- Default model: `gpt-4o`
- Docs: https://docs.llmapi.ai/

## OpenCode usage

In OpenCode environments, choose mode by context:

- CI/bot runs: `static`
- Headless LLM runs: `full`, `openai`, `openrouter`, or `llmapi`
- Model flexibility: `openrouter` (route to any provider)
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

Use any API-key-backed mode:

```bash
export ANTHROPIC_API_KEY="sk-ant-api..."
npm run docs:diagram:full

export OPENAI_API_KEY="sk-..."
npm run docs:diagram:openai

export OPENROUTER_API_KEY="sk-or-..."
npm run docs:diagram:openrouter
```
