import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { orchestrateLLMReasoning } from '../../scripts/archdiagram/phases/reason.js'
import { loadExpectedGraph } from './helpers.js'

const NONE_CONFIG = { provider: 'none' as const }

describe('orchestrateLLMReasoning', () => {
  it('returns valid ArchitectureGraph in fallback mode', async () => {
    const graph = loadExpectedGraph()
    const result = await orchestrateLLMReasoning(graph, NONE_CONFIG)

    expect(result.groups).toBeDefined()
    expect(result.groups.length).toBeGreaterThan(0)
    expect(result.relationships).toBeDefined()
    expect(result.c4Level).toBe(1)
  })

  it('fallback mode groups files by top-level directory', async () => {
    const graph = loadExpectedGraph()
    const result = await orchestrateLLMReasoning(graph, NONE_CONFIG)

    const groupNames = result.groups.map(g => g.name.toLowerCase())
    expect(groupNames.some(n => n.includes('service') || n === 'root')).toBe(true)
  })

  it('every file appears in exactly one group', async () => {
    const graph = loadExpectedGraph()
    const result = await orchestrateLLMReasoning(graph, NONE_CONFIG)

    const allGroupFiles = result.groups.flatMap(g => g.files)
    const uniqueFiles = new Set(allGroupFiles)
    expect(uniqueFiles.size).toBe(allGroupFiles.length)

    for (const mod of graph.modules) {
      expect(uniqueFiles.has(mod.path)).toBe(true)
    }
  })

  it('all groups have at least one file', async () => {
    const graph = loadExpectedGraph()
    const result = await orchestrateLLMReasoning(graph, NONE_CONFIG)

    for (const group of result.groups) {
      expect(group.files.length).toBeGreaterThan(0)
    }
  })

  it('fallback mode computes inter-directory relationships from edges', async () => {
    const graph = loadExpectedGraph()
    const result = await orchestrateLLMReasoning(graph, NONE_CONFIG)

    expect(result.relationships).toBeDefined()
    expect(Array.isArray(result.relationships)).toBe(true)
    for (const rel of result.relationships) {
      expect(rel.from).toBeTruthy()
      expect(rel.to).toBeTruthy()
      expect(rel.from).not.toBe(rel.to)
    }
  })

  it('files in root directory are grouped under Root', async () => {
    const graph = loadExpectedGraph()
    const result = await orchestrateLLMReasoning(graph, NONE_CONFIG)

    const rootGroup = result.groups.find(g => g.name === 'Root')
    expect(rootGroup).toBeDefined()
    expect(rootGroup!.files).toContain('index.ts')
    expect(rootGroup!.files).toContain('app.ts')
  })

  it('subscription mode without auth token falls back to directory grouping', async () => {
    const originalHome = process.env.HOME
    const originalFetch = global.fetch
    const tempHome = path.join('/tmp', `llm-diagrams-no-creds-${Date.now()}`)

    fs.mkdirSync(tempHome, { recursive: true })
    process.env.HOME = tempHome
    delete process.env.ANTHROPIC_AUTH_TOKEN
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    global.fetch = ((() => {
      throw new Error('fetch should not be called in fallback mode')
    }) as unknown) as typeof fetch

    try {
      const graph = loadExpectedGraph()
      const result = await orchestrateLLMReasoning(graph, { provider: 'claude-subscription' })

      expect(result.c4Level).toBe(1)
      expect(result.groups.length).toBeGreaterThan(0)
    } finally {
      process.env.HOME = originalHome
      global.fetch = originalFetch
    }
  })
})
