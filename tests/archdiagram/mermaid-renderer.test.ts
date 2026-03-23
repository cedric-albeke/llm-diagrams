import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { renderMermaid } from '../../scripts/archdiagram/renderers/mermaid.js'
import type { ArchitectureGraph } from '../../scripts/archdiagram/types.js'

const OUTPUT_DIR = '/tmp/test-archdiagram-mermaid'

afterAll(() => {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
})

function makeSimpleGraph(): ArchitectureGraph {
  return {
    groups: [
      {
        name: 'Authentication',
        description: 'Handles auth',
        files: ['auth/service.ts', 'auth/middleware.ts'],
        role: 'backend',
      },
      {
        name: 'Database',
        description: 'DB access',
        files: ['db/client.ts', 'db/models.ts'],
        role: 'backend',
      },
    ],
    relationships: [
      { from: 'Authentication', to: 'Database', label: 'API calls', style: 'sync' },
    ],
    c4Level: 1,
  }
}

describe('renderMermaid', () => {
  it('returns success and writes file', async () => {
    const graph = makeSimpleGraph()
    const result = await renderMermaid(graph, OUTPUT_DIR, 'test-diagram')

    expect(result.success).toBe(true)
    expect(result.format).toBe('mermaid')
    expect(result.filePath).toBe(path.join(OUTPUT_DIR, 'test-diagram.md'))
    expect(fs.existsSync(result.filePath)).toBe(true)
  })

  it('output contains graph LR', async () => {
    const graph = makeSimpleGraph()
    const result = await renderMermaid(graph, OUTPUT_DIR, 'test-graphlr')
    const content = fs.readFileSync(result.filePath, 'utf-8')

    expect(content).toContain('graph LR')
  })

  it('output starts with markdown heading and mermaid code block', async () => {
    const graph = makeSimpleGraph()
    const result = await renderMermaid(graph, OUTPUT_DIR, 'test-heading')
    const content = fs.readFileSync(result.filePath, 'utf-8')

    expect(content).toMatch(/^# Architecture: System Overview/)
    expect(content).toContain('```mermaid')
    expect(content).toContain('```\n')
  })

  it('each group appears as a subgraph', async () => {
    const graph = makeSimpleGraph()
    const result = await renderMermaid(graph, OUTPUT_DIR, 'test-subgraphs')
    const content = fs.readFileSync(result.filePath, 'utf-8')

    expect(content).toContain('subgraph authentication')
    expect(content).toContain('subgraph database')
    expect(content).toContain('end')
  })

  it('relationships generate --> edges', async () => {
    const graph = makeSimpleGraph()
    const result = await renderMermaid(graph, OUTPUT_DIR, 'test-edges')
    const content = fs.readFileSync(result.filePath, 'utf-8')

    expect(content).toContain('-->')
    expect(content).toContain('authentication')
    expect(content).toContain('database')
  })

  it('no forbidden mermaid chars in mermaid body', async () => {
    const graph: ArchitectureGraph = {
      groups: [
        {
          name: 'Auth (Service): {core}',
          description: 'test',
          files: ['auth.ts'],
          role: 'backend',
        },
      ],
      relationships: [
        { from: 'Auth (Service): {core}', to: 'Auth (Service): {core}', label: 'self(call)', style: 'sync' },
      ],
      c4Level: 1,
    }
    const result = await renderMermaid(graph, OUTPUT_DIR, 'test-sanitize')
    const content = fs.readFileSync(result.filePath, 'utf-8')

    const mermaidStart = content.indexOf('graph LR')
    const mermaidEnd = content.lastIndexOf('```')
    const mermaidBody = content.slice(mermaidStart, mermaidEnd)

    expect(mermaidBody).not.toMatch(/[{}()]/)
  })

  it('uses default filename when not provided', async () => {
    const graph = makeSimpleGraph()
    const result = await renderMermaid(graph, OUTPUT_DIR)

    expect(result.filePath).toContain('system-overview.md')
    expect(result.success).toBe(true)
  })

  it('handles empty groups and relationships', async () => {
    const graph: ArchitectureGraph = {
      groups: [],
      relationships: [],
      c4Level: 1,
    }
    const result = await renderMermaid(graph, OUTPUT_DIR, 'test-empty')

    expect(result.success).toBe(true)
    const content = fs.readFileSync(result.filePath, 'utf-8')
    expect(content).toContain('graph LR')
  })
})
