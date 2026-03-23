import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { FIXTURE_PATH, FIXTURE_SRC, FIXTURE_TSCONFIG, loadExpectedGraph } from './helpers.js'

describe('Test Fixtures', () => {
  it('fixture directory exists', () => {
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true)
  })

  it('fixture has exactly 8 TypeScript files', () => {
    const countTs = (dir: string): number => {
      let count = 0
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          count += countTs(fullPath)
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.json')) {
          count++
        }
      }
      return count
    }
    const count = countTs(FIXTURE_PATH)
    expect(count).toBe(8)
  })

  it('fixture src directory exists', () => {
    expect(fs.existsSync(FIXTURE_SRC)).toBe(true)
  })

  it('fixture tsconfig.json exists', () => {
    expect(fs.existsSync(FIXTURE_TSCONFIG)).toBe(true)
  })

  it('fixture tsconfig has @/ path alias', () => {
    const tsconfig = JSON.parse(fs.readFileSync(FIXTURE_TSCONFIG, 'utf-8'))
    expect(tsconfig.compilerOptions?.paths?.['@/*']).toBeDefined()
  })

  it('loadExpectedGraph returns valid structure', () => {
    const graph = loadExpectedGraph()
    expect(graph.modules.length).toBeGreaterThan(0)
    expect(graph.edges.length).toBeGreaterThan(0)
    const barrels = graph.modules.filter(m => m.isBarrel)
    expect(barrels.length).toBe(3)
  })

  it('app.ts module has use client directive in expected graph', () => {
    const graph = loadExpectedGraph()
    const appModule = graph.modules.find(m => m.path === 'app.ts')
    expect(appModule).toBeDefined()
    expect(appModule?.directives).toContain('use client')
  })

  it('AuthService found in expected graph', () => {
    const graph = loadExpectedGraph()
    const authModule = graph.modules.find(m => m.path === 'services/auth.ts')
    expect(authModule).toBeDefined()
    const authServiceExport = authModule?.exports.find(e => e.name === 'AuthService')
    expect(authServiceExport).toBeDefined()
    expect(authServiceExport?.kind).toBe('class')
  })
})
