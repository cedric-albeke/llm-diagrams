import type { LLMAdapter, LLMRequest } from './types.js'

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string }
  }>
}

interface ProviderDefaults {
  baseUrl: string
  envKey: string
  defaultModel: string
  extraHeaders?: Record<string, string>
}

const PROVIDER_DEFAULTS: Record<string, ProviderDefaults> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/cedric-albeke/llm-diagrams',
      'X-Title': 'llm-diagrams',
    },
  },
  llmapi: {
    baseUrl: 'https://api.llmapi.ai/v1',
    envKey: 'LLMAPI_API_KEY',
    defaultModel: 'gpt-4o',
  },
}

async function fetchWithRetry(input: string, init: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(input, init)
    if ((response.status === 429 || response.status === 529) && i < retries - 1) {
      const retryAfter = response.headers.get('retry-after')
      const retryMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : (i + 1) * 2000
      await new Promise(resolve => setTimeout(resolve, Number.isNaN(retryMs) ? (i + 1) * 2000 : retryMs))
      continue
    }
    return response
  }
  return fetch(input, init)
}

export class OpenAICompatibleAdapter implements LLMAdapter {
  private readonly providerKey: string

  constructor(providerKey: string) {
    if (!PROVIDER_DEFAULTS[providerKey]) {
      throw new Error(`Unknown OpenAI-compatible provider: ${providerKey}`)
    }
    this.providerKey = providerKey
  }

  async call(request: LLMRequest): Promise<string> {
    const defaults = PROVIDER_DEFAULTS[this.providerKey]
    const apiKey = request.config.apiKey ?? process.env[defaults.envKey]
    if (!apiKey) {
      throw new Error(`${defaults.envKey} not set`)
    }

    const baseUrl = (request.config.baseUrl ?? defaults.baseUrl).replace(/\/+$/, '')
    const model = request.config.model ?? defaults.defaultModel

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      ...defaults.extraHeaders,
    }

    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        max_tokens: 4096,
        temperature: request.config.temperature ?? 0.1,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`${this.providerKey} API error ${response.status}: ${body}`)
    }

    const payload = await response.json() as OpenAIChatResponse
    const text = payload.choices?.[0]?.message?.content

    if (typeof text !== 'string' || text.length === 0) {
      throw new Error(`${this.providerKey} returned empty response`)
    }

    return text
  }
}
