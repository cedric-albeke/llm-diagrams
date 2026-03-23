import { describe, it, expect } from 'vitest'
import { resolveBarrelExports } from '../../scripts/archdiagram/utils/barrel-resolver.js'
import type { ImportGraph, ModuleNode, ImportEdge } from '../../scripts/archdiagram/types.js'

function makeGraph(modules: Partial<ModuleNode>[], edges: Partial<ImportEdge>[]): ImportGraph {
  return {
    modules: modules.map(m => ({
      path: m.path!,
      isBarrel: m.isBarrel ?? false,
      exports: m.exports ?? [],
      directives: m.directives ?? [],
    })),
    edges: edges.map(e => ({
      source: e.source!,
      target: e.target!,
      dependencyTypes: e.dependencyTypes ?? [],
    })),
  }
}

describe('resolveBarrelExports', () => {
  it('inlines direct barrel edge', () => {
    const graph = makeGraph(
      [
        { path: 'app.ts', isBarrel: false },
        { path: 'services/index.ts', isBarrel: true },
        { path: 'services/auth.ts', isBarrel: false },
      ],
      [
        { source: 'app.ts', target: 'services/index.ts' },
        { source: 'services/index.ts', target: 'services/auth.ts' },
      ]
    )

    const resolved = resolveBarrelExports(graph)

    const directEdge = resolved.edges.find(e => e.source === 'app.ts' && e.target === 'services/auth.ts')
    expect(directEdge).toBeDefined()

    const barrelEdge = resolved.edges.find(e => e.source === 'app.ts' && e.target === 'services/index.ts')
    expect(barrelEdge).toBeUndefined()
  })

  it('handles nested barrels', () => {
    const graph = makeGraph(
      [
        { path: 'app.ts', isBarrel: false },
        { path: 'index.ts', isBarrel: true },
        { path: 'services/index.ts', isBarrel: true },
        { path: 'services/auth.ts', isBarrel: false },
      ],
      [
        { source: 'app.ts', target: 'index.ts' },
        { source: 'index.ts', target: 'services/index.ts' },
        { source: 'services/index.ts', target: 'services/auth.ts' },
      ]
    )

    const resolved = resolveBarrelExports(graph)

    const directEdge = resolved.edges.find(e => e.source === 'app.ts' && e.target === 'services/auth.ts')
    expect(directEdge).toBeDefined()
  })

  it('preserves barrel nodes in module list', () => {
    const graph = makeGraph(
      [
        { path: 'app.ts', isBarrel: false },
        { path: 'index.ts', isBarrel: true },
        { path: 'auth.ts', isBarrel: false },
      ],
      [
        { source: 'app.ts', target: 'index.ts' },
        { source: 'index.ts', target: 'auth.ts' },
      ]
    )

    const resolved = resolveBarrelExports(graph)
    expect(resolved.modules.length).toBe(3)
    expect(resolved.modules.find(m => m.path === 'index.ts')).toBeDefined()
  })

  it('preserves edges between non-barrel files', () => {
    const graph = makeGraph(
      [
        { path: 'auth.ts', isBarrel: false },
        { path: 'db.ts', isBarrel: false },
      ],
      [
        { source: 'auth.ts', target: 'db.ts' },
      ]
    )

    const resolved = resolveBarrelExports(graph)

    const edge = resolved.edges.find(e => e.source === 'auth.ts' && e.target === 'db.ts')
    expect(edge).toBeDefined()
  })

  it('does not mutate input graph', () => {
    const graph = makeGraph(
      [
        { path: 'app.ts', isBarrel: false },
        { path: 'index.ts', isBarrel: true },
        { path: 'auth.ts', isBarrel: false },
      ],
      [
        { source: 'app.ts', target: 'index.ts' },
        { source: 'index.ts', target: 'auth.ts' },
      ]
    )

    const originalEdgeCount = graph.edges.length
    resolveBarrelExports(graph)
    expect(graph.edges.length).toBe(originalEdgeCount)
  })
})
