import type { ImportGraph, ImportEdge } from '../types.js'

export function resolveBarrelExports(graph: ImportGraph): ImportGraph {
  const barrelMap = new Map<string, Set<string>>()

  function resolveBarrel(barrelPath: string, visited: Set<string> = new Set()): Set<string> {
    if (visited.has(barrelPath)) return new Set()
    visited.add(barrelPath)

    const cached = barrelMap.get(barrelPath)
    if (cached !== undefined) return cached

    const result = new Set<string>()
    const outbound = graph.edges.filter(e => e.source === barrelPath)

    for (const edge of outbound) {
      const targetMod = graph.modules.find(m => m.path === edge.target)
      if (targetMod?.isBarrel) {
        for (const t of resolveBarrel(edge.target, new Set(visited))) result.add(t)
      } else {
        result.add(edge.target)
      }
    }

    barrelMap.set(barrelPath, result)
    return result
  }

  for (const mod of graph.modules) {
    if (mod.isBarrel) resolveBarrel(mod.path)
  }

  const newEdges: ImportEdge[] = []

  const addEdge = (source: string, target: string, dependencyTypes: string[]): void => {
    if (source === target) return
    if (!newEdges.some(e => e.source === source && e.target === target)) {
      newEdges.push({ source, target, dependencyTypes })
    }
  }

  for (const edge of graph.edges) {
    const targetMod = graph.modules.find(m => m.path === edge.target)
    if (targetMod?.isBarrel) {
      for (const realTarget of barrelMap.get(edge.target) ?? new Set<string>()) {
        addEdge(edge.source, realTarget, edge.dependencyTypes)
      }
    } else {
      addEdge(edge.source, edge.target, edge.dependencyTypes)
    }
  }

  return { modules: graph.modules, edges: newEdges }
}
