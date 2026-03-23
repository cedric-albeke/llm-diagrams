import { describe, it, expect } from 'vitest'
import { extractImportGraph } from '../../scripts/archdiagram/phases/analyze.js'
import { FIXTURE_SRC, FIXTURE_TSCONFIG } from '../archdiagram/helpers.js'

describe('extractImportGraph', () => {
  it('extracts modules from fixture project', async () => {
    const graph = await extractImportGraph({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })

    expect(graph.modules.length).toBeGreaterThan(0)
    expect(graph.edges.length).toBeGreaterThan(0)
  }, 30000)

  it('detects barrel files', async () => {
    const graph = await extractImportGraph({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })

    const barrels = graph.modules.filter((m) => m.isBarrel)
    expect(barrels.length).toBeGreaterThan(0)

    const indexFiles = graph.modules.filter((m) => m.path.includes('index'))
    expect(indexFiles.length).toBeGreaterThan(0)
    expect(indexFiles.every((m) => m.isBarrel)).toBe(true)
  }, 30000)

  it('throws on non-existent srcDir', async () => {
    await expect(
      extractImportGraph({
        srcDir: '/nonexistent/path/that/does/not/exist',
        tsConfigPath: 'tsconfig.json',
        exclude: [],
      })
    ).rejects.toThrow(/srcDir/)
  })

  it('produces paths relative to srcDir', async () => {
    const graph = await extractImportGraph({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })

    for (const mod of graph.modules) {
      expect(mod.path).not.toMatch(/^\//)
      expect(mod.path).not.toMatch(/^@\//)
    }

    for (const edge of graph.edges) {
      expect(edge.source).not.toMatch(/^\//)
      expect(edge.target).not.toMatch(/^\//)
    }
  }, 30000)

  it('finds expected module count and key modules', async () => {
    const graph = await extractImportGraph({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })

    expect(graph.modules.length).toBeGreaterThanOrEqual(7)

    const paths = graph.modules.map((m) => m.path)
    expect(paths).toContain('app.ts')
    expect(paths).toContain('index.ts')
    expect(paths).toContain('services/index.ts')
    expect(paths).toContain('services/auth.ts')
    expect(paths).toContain('services/db.ts')
    expect(paths).toContain('utils/index.ts')
    expect(paths).toContain('utils/logger.ts')
  }, 30000)

  it('creates edges with resolved targets (no @/ aliases)', async () => {
    const graph = await extractImportGraph({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })

    for (const edge of graph.edges) {
      expect(edge.target).not.toMatch(/^@\//)
      expect(edge.dependencyTypes.length).toBeGreaterThan(0)
    }
  }, 30000)

  it('marks all index.ts files as barrels', async () => {
    const graph = await extractImportGraph({
      srcDir: FIXTURE_SRC,
      tsConfigPath: FIXTURE_TSCONFIG,
      exclude: [],
    })

    const indexModules = graph.modules.filter((m) => m.path.endsWith('index.ts'))
    expect(indexModules.length).toBeGreaterThanOrEqual(3)
    expect(indexModules.every((m) => m.isBarrel)).toBe(true)

    const nonIndexModules = graph.modules.filter((m) => !m.path.endsWith('index.ts'))
    expect(nonIndexModules.every((m) => !m.isBarrel)).toBe(true)
  }, 30000)
})
