import { describe, it, expect } from 'vitest'
import {
  FILE_ANALYST_SYSTEM_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  FileSummarySchema,
  ArchitectureOutputSchema,
  createFileSummarySchemaWithPaths,
  createArchitectureSchemaWithPaths,
  buildAnalystPrompt,
  buildArchitectPrompt,
} from '../../scripts/archdiagram/phases/reason.js'
import type { ModuleNode, FileSummary, ImportEdge } from '../../scripts/archdiagram/types.js'

const makeNode = (path: string, overrides: Partial<ModuleNode> = {}): ModuleNode => ({
  path,
  isBarrel: false,
  exports: [],
  directives: [],
  ...overrides,
})

describe('Prompt Templates', () => {
  it('FILE_ANALYST_SYSTEM_PROMPT exists and has key content', () => {
    expect(FILE_ANALYST_SYSTEM_PROMPT).toContain('VALID FILE PATHS')
    expect(FILE_ANALYST_SYSTEM_PROMPT).toContain('JSON')
  })

  it('ARCHITECT_SYSTEM_PROMPT exists and has key content', () => {
    expect(ARCHITECT_SYSTEM_PROMPT).toContain('VALID FILE PATHS')
    expect(ARCHITECT_SYSTEM_PROMPT).toContain('group')
  })
})

describe('buildAnalystPrompt', () => {
  it('includes all valid file paths', () => {
    const nodes = [makeNode('src/auth.ts'), makeNode('src/db.ts'), makeNode('src/logger.ts')]
    const prompt = buildAnalystPrompt(nodes)

    expect(prompt).toContain('src/auth.ts')
    expect(prompt).toContain('src/db.ts')
    expect(prompt).toContain('src/logger.ts')
  })

  it('includes VALID FILE PATHS section', () => {
    const nodes = [makeNode('src/auth.ts')]
    const prompt = buildAnalystPrompt(nodes)
    expect(prompt).toContain('VALID FILE PATHS')
  })
})

describe('buildArchitectPrompt', () => {
  it('includes all valid file paths', () => {
    const summaries: FileSummary[] = [
      { filePath: 'src/auth.ts', purpose: 'Authentication', role: 'service' },
      { filePath: 'src/db.ts', purpose: 'Database', role: 'service' },
    ]
    const edges: ImportEdge[] = [{ source: 'src/auth.ts', target: 'src/db.ts', dependencyTypes: ['import'] }]

    const prompt = buildArchitectPrompt(summaries, edges)
    expect(prompt).toContain('src/auth.ts')
    expect(prompt).toContain('src/db.ts')
    expect(prompt).toContain('VALID FILE PATHS')
  })
})

describe('Zod Schemas', () => {
  it('FileSummarySchema validates correct input', () => {
    const valid = { filePath: 'src/auth.ts', purpose: 'Authentication service', role: 'service' }
    expect(() => FileSummarySchema.parse(valid)).not.toThrow()
  })

  it('FileSummarySchema rejects missing role', () => {
    const invalid = { filePath: 'src/auth.ts', purpose: 'Auth' }
    expect(() => FileSummarySchema.parse(invalid)).toThrow()
  })

  it('ArchitectureOutputSchema validates correct input', () => {
    const valid = {
      groups: [{ name: 'Auth', description: 'Auth module', files: ['src/auth.ts'], role: 'backend' }],
      relationships: [],
    }
    expect(() => ArchitectureOutputSchema.parse(valid)).not.toThrow()
  })
})

describe('Path Validation (Hallucination Prevention)', () => {
  it('schema with paths rejects hallucinated file path', () => {
    const schema = createFileSummarySchemaWithPaths(['src/auth.ts', 'src/db.ts'])
    const withHallucination = { filePath: 'src/phantom.ts', purpose: 'Phantom file', role: 'service' }

    const result = schema.safeParse(withHallucination)
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error)).toContain('phantom.ts')
  })

  it('schema with paths accepts valid file path', () => {
    const schema = createFileSummarySchemaWithPaths(['src/auth.ts', 'src/db.ts'])
    const valid = { filePath: 'src/auth.ts', purpose: 'Auth service', role: 'service' }

    const result = schema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('architecture schema rejects hallucinated file in group', () => {
    const schema = createArchitectureSchemaWithPaths(['src/auth.ts'])
    const withHallucination = {
      groups: [{ name: 'Auth', description: 'Auth', files: ['src/phantom.ts'], role: 'backend' }],
      relationships: [],
    }

    const result = schema.safeParse(withHallucination)
    expect(result.success).toBe(false)
  })
})
