import { describe, it, expect } from 'vitest'
import { extractSymbolMap } from '../../scripts/archdiagram/phases/analyze.js'
import { FIXTURE_SRC, FIXTURE_TSCONFIG } from '../archdiagram/helpers.js'

describe('extractSymbolMap', () => {
  it('extracts exports from fixture project', async () => {
    const nodes = await extractSymbolMap({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })
    expect(nodes.length).toBeGreaterThan(0)
  }, 30000)

  it('detects AuthService class export', async () => {
    const nodes = await extractSymbolMap({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })
    const authNode = nodes.find(n => n.path.includes('auth') && !n.path.includes('index'))
    expect(authNode).toBeDefined()
    const authService = authNode?.exports.find(e => e.name === 'AuthService')
    expect(authService).toBeDefined()
    expect(authService?.kind).toBe('class')
  }, 30000)

  it('detects use client directive on app.ts', async () => {
    const nodes = await extractSymbolMap({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })
    const appNode = nodes.find(n => n.path === 'app.ts')
    expect(appNode).toBeDefined()
    expect(appNode?.directives).toContain('use client')
  }, 30000)

  it('detects DatabaseClient class export', async () => {
    const nodes = await extractSymbolMap({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })
    const dbNode = nodes.find(n => n.path.includes('db') && !n.path.includes('index'))
    expect(dbNode).toBeDefined()
    const dbClient = dbNode?.exports.find(e => e.name === 'DatabaseClient')
    expect(dbClient).toBeDefined()
    expect(dbClient?.kind).toBe('class')
  }, 30000)

  it('detects createLogger function export', async () => {
    const nodes = await extractSymbolMap({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })
    const loggerNode = nodes.find(n => n.path.includes('logger'))
    expect(loggerNode).toBeDefined()
    const createLogger = loggerNode?.exports.find(e => e.name === 'createLogger')
    expect(createLogger).toBeDefined()
    expect(createLogger?.kind).toBe('function')
  }, 30000)

  it('all nodes have lineCount', async () => {
    const nodes = await extractSymbolMap({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })
    for (const node of nodes) {
      expect(node.lineCount).toBeDefined()
      expect(node.lineCount).toBeGreaterThan(0)
    }
  }, 30000)
})
