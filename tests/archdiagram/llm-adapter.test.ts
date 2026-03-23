import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
  ;(MockAnthropic as unknown as Record<string, unknown>)._mockCreate = mockCreate
  return { default: MockAnthropic }
})

vi.mock('node:child_process', () => {
  const mockExecFileSync = vi.fn()
  return {
    execFileSync: mockExecFileSync,
    __mockExecFileSync: mockExecFileSync,
  }
})

import { callLLM, batchAnalyze } from '../../scripts/archdiagram/phases/reason.js'
import type { LLMConfig, ModuleNode } from '../../scripts/archdiagram/types.js'

const STATIC_CONFIG: LLMConfig = { provider: 'none' }
const LLM_CONFIG: LLMConfig = {
  provider: 'anthropic',
  apiKey: 'test-key-abc123',
  model: 'test-model',
  temperature: 0.1,
}
const SUBSCRIPTION_CONFIG: LLMConfig = {
  provider: 'claude-subscription',
  model: 'test-model',
  temperature: 0.1,
}

function makeNode(path: string): ModuleNode {
  return { path, isBarrel: false, exports: [], directives: [] }
}

async function getMockCreate() {
  const mod = await import('@anthropic-ai/sdk')
  return (mod.default as unknown as Record<string, unknown>)._mockCreate as ReturnType<typeof vi.fn>
}

async function getMockExecFileSync() {
  const mod = await import('node:child_process')
  return (mod as unknown as Record<string, unknown>).__mockExecFileSync as ReturnType<typeof vi.fn>
}

describe('batchAnalyze — static mode (provider: none)', () => {
  it('returns empty array', async () => {
    const result = await batchAnalyze([makeNode('src/auth.ts')], STATIC_CONFIG)
    expect(result).toEqual([])
  })

  it('returns empty array with no nodes', async () => {
    const result = await batchAnalyze([], STATIC_CONFIG)
    expect(result).toEqual([])
  })

  it('returns empty array with multiple nodes across dirs', async () => {
    const nodes = [
      makeNode('src/auth/login.ts'),
      makeNode('src/auth/logout.ts'),
      makeNode('src/payments/stripe.ts'),
    ]
    const result = await batchAnalyze(nodes, STATIC_CONFIG)
    expect(result).toEqual([])
  })

  it('makes zero API calls when provider is none', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    await batchAnalyze([makeNode('src/auth.ts'), makeNode('src/utils.ts')], STATIC_CONFIG)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('callLLM — static mode (provider: none)', () => {
  it('throws when provider is none', async () => {
    const schema = z.object({ value: z.string() })
    await expect(callLLM('sys', 'user', schema, STATIC_CONFIG)).rejects.toThrow(
      'LLM provider is none'
    )
  })
})

describe('callLLM — API key handling', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  it('throws when no API key available', async () => {
    const schema = z.object({ value: z.string() })
    const configNoKey: LLMConfig = { provider: 'anthropic' }
    await expect(callLLM('sys', 'user', schema, configNoKey)).rejects.toThrow(
      'ANTHROPIC_API_KEY not set'
    )
  })

  it('uses process.env.ANTHROPIC_API_KEY when apiKey not in config', async () => {
    process.env.ANTHROPIC_API_KEY = 'env-key-xyz'
    const mockCreate = await getMockCreate()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"value":"hello"}' }],
    })
    const schema = z.object({ value: z.string() })
    const configNoKey: LLMConfig = { provider: 'anthropic' }
    const result = await callLLM('sys', 'user', schema, configNoKey)
    expect(result).toEqual({ value: 'hello' })
    delete process.env.ANTHROPIC_API_KEY
  })
})

describe('callLLM — subscription mode', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_AUTH_TOKEN
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  })

  it('does not require ANTHROPIC_API_KEY in subscription mode', async () => {
    const mockExecFileSync = await getMockExecFileSync()
    mockExecFileSync.mockClear()
    mockExecFileSync.mockReturnValue('{"ok":true}')

    const schema = z.object({ ok: z.boolean() })
    const result = await callLLM('sys', 'user', schema, SUBSCRIPTION_CONFIG)
    expect(result).toEqual({ ok: true })
    expect(mockExecFileSync).toHaveBeenCalled()
  })

  it('surfaces HTTP errors from subscription endpoint clearly', async () => {
    const mockExecFileSync = await getMockExecFileSync()
    mockExecFileSync.mockClear()
    mockExecFileSync.mockImplementation(() => {
      throw new Error('not authenticated')
    })

    const schema = z.object({ ok: z.boolean() })
    await expect(callLLM('sys', 'user', schema, SUBSCRIPTION_CONFIG)).rejects.toThrow(
      'Claude subscription execution failed'
    )
  })
})

describe('callLLM — successful response', () => {
  it('parses plain JSON response', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"name":"auth","count":3}' }],
    })
    const schema = z.object({ name: z.string(), count: z.number() })
    const result = await callLLM('sys', 'user', schema, LLM_CONFIG)
    expect(result).toEqual({ name: 'auth', count: 3 })
  })

  it('strips markdown code fences (```json ... ```)', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n{"name":"auth"}\n```' }],
    })
    const schema = z.object({ name: z.string() })
    const result = await callLLM('sys', 'user', schema, LLM_CONFIG)
    expect(result).toEqual({ name: 'auth' })
  })

  it('strips plain code fences (``` ... ```)', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```\n{"name":"service"}\n```' }],
    })
    const schema = z.object({ name: z.string() })
    const result = await callLLM('sys', 'user', schema, LLM_CONFIG)
    expect(result).toEqual({ name: 'service' })
  })

  it('uses default model when not specified in config', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"ok":true}' }],
    })
    const schema = z.object({ ok: z.boolean() })
    const minimalConfig: LLMConfig = { provider: 'anthropic', apiKey: 'key' }
    await callLLM('sys', 'user', schema, minimalConfig)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-20250514' })
    )
  })

  it('uses default temperature 0.1 when not specified', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"ok":true}' }],
    })
    const schema = z.object({ ok: z.boolean() })
    const minimalConfig: LLMConfig = { provider: 'anthropic', apiKey: 'key' }
    await callLLM('sys', 'user', schema, minimalConfig)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.1 })
    )
  })
})

describe('callLLM — retry logic', () => {
  it('retries on JSON parse failure and succeeds on 2nd attempt', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'not-valid-json{{{' }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '{"fixed":true}' }] })

    const schema = z.object({ fixed: z.boolean() })
    const result = await callLLM('sys', 'user', schema, LLM_CONFIG)
    expect(result).toEqual({ fixed: true })
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('retries on schema validation failure and succeeds on 2nd attempt', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '{"value":123}' }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '{"value":"correct"}' }] })

    const schema = z.object({ value: z.string() })
    const result = await callLLM('sys', 'user', schema, LLM_CONFIG)
    expect(result).toEqual({ value: 'correct' })
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('throws after 3 failed JSON parse attempts', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'bad{json' }] })

    const schema = z.object({ value: z.string() })
    await expect(callLLM('sys', 'user', schema, LLM_CONFIG)).rejects.toThrow(
      'JSON parse failed after 3 attempts'
    )
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })

  it('throws after 3 failed schema validation attempts', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '{"wrong":true}' }] })

    const schema = z.object({ value: z.string() })
    await expect(callLLM('sys', 'user', schema, LLM_CONFIG)).rejects.toThrow(
      'Schema validation failed'
    )
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })
})

describe('callLLM — unexpected response type', () => {
  it('throws on non-text content block', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'x', name: 'fn', input: {} }],
    })
    const schema = z.object({ value: z.string() })
    await expect(callLLM('sys', 'user', schema, LLM_CONFIG)).rejects.toThrow(
      'Unexpected response type'
    )
  })
})

describe('batchAnalyze — API mode', () => {
  it('groups nodes by directory and calls LLM per group', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()

    const authSummary = { filePath: 'src/auth/login.ts', purpose: 'handles login', role: 'service' }
    const paymentSummary = { filePath: 'src/payments/stripe.ts', purpose: 'stripe integration', role: 'service' }

    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify([authSummary]) }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify([paymentSummary]) }] })

    const nodes = [
      makeNode('src/auth/login.ts'),
      makeNode('src/payments/stripe.ts'),
    ]
    const result = await batchAnalyze(nodes, LLM_CONFIG)
    expect(result).toHaveLength(2)
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('returns partial results when one batch fails', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()

    const authSummary = { filePath: 'src/auth/login.ts', purpose: 'handles login', role: 'service' }

    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify([authSummary]) }] })
      .mockRejectedValueOnce(new Error('network error'))

    const nodes = [
      makeNode('src/auth/login.ts'),
      makeNode('src/payments/stripe.ts'),
    ]
    const result = await batchAnalyze(nodes, LLM_CONFIG)
    expect(result).toHaveLength(1)
    expect(result[0].filePath).toBe('src/auth/login.ts')
  })

  it('groups multiple files in same dir into one batch', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockClear()

    const summaries = [
      { filePath: 'src/auth/login.ts', purpose: 'login', role: 'service' },
      { filePath: 'src/auth/logout.ts', purpose: 'logout', role: 'service' },
    ]
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(summaries) }],
    })

    const nodes = [makeNode('src/auth/login.ts'), makeNode('src/auth/logout.ts')]
    const result = await batchAnalyze(nodes, LLM_CONFIG)
    expect(result).toHaveLength(2)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})

describe('callLLM — OpenAI-compatible providers', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = originalFetch
  })

  function mockOpenAIFetch(responseText: string) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: responseText } }],
      }),
    }) as unknown as typeof fetch
  }

  it('openai mode calls OpenAI API and parses response', async () => {
    mockOpenAIFetch('{"value":"hello"}')
    const schema = z.object({ value: z.string() })
    const config: LLMConfig = { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' }
    const result = await callLLM('sys', 'user', schema, config)
    expect(result).toEqual({ value: 'hello' })
  })

  it('openrouter mode calls OpenRouter API and parses response', async () => {
    mockOpenAIFetch('{"value":"world"}')
    const schema = z.object({ value: z.string() })
    const config: LLMConfig = { provider: 'openrouter', apiKey: 'sk-or-test', model: 'anthropic/claude-sonnet-4-20250514' }
    const result = await callLLM('sys', 'user', schema, config)
    expect(result).toEqual({ value: 'world' })
  })

  it('llmapi mode calls llmapi.ai API and parses response', async () => {
    mockOpenAIFetch('{"value":"llm"}')
    const schema = z.object({ value: z.string() })
    const config: LLMConfig = { provider: 'llmapi', apiKey: 'llm-test-key', model: 'gpt-4o' }
    const result = await callLLM('sys', 'user', schema, config)
    expect(result).toEqual({ value: 'llm' })
  })

  it('openai mode throws when no API key is set', async () => {
    delete process.env.OPENAI_API_KEY
    const schema = z.object({ value: z.string() })
    const config: LLMConfig = { provider: 'openai' }
    await expect(callLLM('sys', 'user', schema, config)).rejects.toThrow('OPENAI_API_KEY not set')
  })

  it('openrouter mode throws when no API key is set', async () => {
    delete process.env.OPENROUTER_API_KEY
    const schema = z.object({ value: z.string() })
    const config: LLMConfig = { provider: 'openrouter' }
    await expect(callLLM('sys', 'user', schema, config)).rejects.toThrow('OPENROUTER_API_KEY not set')
  })

  it('llmapi mode throws when no API key is set', async () => {
    delete process.env.LLMAPI_API_KEY
    const schema = z.object({ value: z.string() })
    const config: LLMConfig = { provider: 'llmapi' }
    await expect(callLLM('sys', 'user', schema, config)).rejects.toThrow('LLMAPI_API_KEY not set')
  })

  it('openai mode surfaces HTTP errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }) as unknown as typeof fetch

    const schema = z.object({ value: z.string() })
    const config: LLMConfig = { provider: 'openai', apiKey: 'bad-key' }
    await expect(callLLM('sys', 'user', schema, config)).rejects.toThrow('401')
  })
})
