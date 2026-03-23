import { describe, it, expect } from 'vitest'
import { buildUnifiedGraph } from '../../scripts/archdiagram/utils/graph-utils.js'
import { extractImportGraph, extractSymbolMap } from '../../scripts/archdiagram/phases/analyze.js'
import { resolveBarrelExports } from '../../scripts/archdiagram/utils/barrel-resolver.js'
import { FIXTURE_SRC, FIXTURE_TSCONFIG } from '../archdiagram/helpers.js'

describe('buildUnifiedGraph', () => {
  it('merges import graph with symbol data', async () => {
    const importGraph = await extractImportGraph({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const symbolNodes = await extractSymbolMap({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const resolvedGraph = resolveBarrelExports(importGraph)

    const unified = buildUnifiedGraph(resolvedGraph, symbolNodes)

    expect(unified.modules.length).toBeGreaterThan(0)

    const authNode = unified.modules.find(m => m.path.includes('auth') && !m.path.includes('index'))
    expect(authNode).toBeDefined()
    expect(authNode?.exports.length).toBeGreaterThan(0)
  }, 30000)

  it('produces directory groups', async () => {
    const importGraph = await extractImportGraph({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const symbolNodes = await extractSymbolMap({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const resolvedGraph = resolveBarrelExports(importGraph)

    const unified = buildUnifiedGraph(resolvedGraph, symbolNodes)

    expect(unified.directoryGroups.length).toBeGreaterThan(0)

    const dirs = unified.directoryGroups.map(g => g.directory)
    expect(dirs).toContain('services')
    expect(dirs).toContain('utils')
  }, 30000)

  it('preserves edges from resolved import graph', async () => {
    const importGraph = await extractImportGraph({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const symbolNodes = await extractSymbolMap({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const resolvedGraph = resolveBarrelExports(importGraph)

    const unified = buildUnifiedGraph(resolvedGraph, symbolNodes)

    expect(unified.edges.length).toBe(resolvedGraph.edges.length)
  }, 30000)

  it('attaches directives from symbol data', async () => {
    const importGraph = await extractImportGraph({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const symbolNodes = await extractSymbolMap({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const resolvedGraph = resolveBarrelExports(importGraph)

    const unified = buildUnifiedGraph(resolvedGraph, symbolNodes)

    const appNode = unified.modules.find(m => m.path === 'app.ts')
    expect(appNode).toBeDefined()
    expect(appNode?.directives).toContain('use client')
  }, 30000)

  it('assigns roles to nodes', async () => {
    const importGraph = await extractImportGraph({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const symbolNodes = await extractSymbolMap({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const resolvedGraph = resolveBarrelExports(importGraph)

    const unified = buildUnifiedGraph(resolvedGraph, symbolNodes)

    const nonBarrels = unified.modules.filter(m => !m.isBarrel)
    for (const node of nonBarrels) {
      expect(node.role).toBeDefined()
      expect(node.role).not.toBe('unknown')
    }
  }, 30000)

  it('groups fixture files into root, services, and utils directories', async () => {
    const importGraph = await extractImportGraph({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const symbolNodes = await extractSymbolMap({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const resolvedGraph = resolveBarrelExports(importGraph)

    const unified = buildUnifiedGraph(resolvedGraph, symbolNodes)

    expect(unified.directoryGroups).toHaveLength(3)

    const serviceGroup = unified.directoryGroups.find(g => g.directory === 'services')
    expect(serviceGroup).toBeDefined()
    expect(serviceGroup?.files.length).toBeGreaterThan(0)

    const utilGroup = unified.directoryGroups.find(g => g.directory === 'utils')
    expect(utilGroup).toBeDefined()
    expect(utilGroup?.files.length).toBeGreaterThan(0)
  }, 30000)

  it('computes inter-directory edge counts', async () => {
    const importGraph = await extractImportGraph({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const symbolNodes = await extractSymbolMap({ srcDir: FIXTURE_SRC, tsConfigPath: FIXTURE_TSCONFIG, exclude: [] })
    const resolvedGraph = resolveBarrelExports(importGraph)

    const unified = buildUnifiedGraph(resolvedGraph, symbolNodes)

    const serviceGroup = unified.directoryGroups.find(g => g.directory === 'services')
    expect(serviceGroup).toBeDefined()
    expect(serviceGroup!.incomingEdges).toBeGreaterThan(0)
  }, 30000)
})
