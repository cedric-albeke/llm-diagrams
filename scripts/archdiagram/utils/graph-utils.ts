import type { ImportGraph, ModuleNode, ModuleRole } from '../types.js'

export interface DirectoryGroup {
  directory: string
  files: string[]
  incomingEdges: number
  outgoingEdges: number
}

export interface UnifiedGraph extends ImportGraph {
  directoryGroups: DirectoryGroup[]
}

export function buildUnifiedGraph(
  importGraph: ImportGraph,
  symbolNodes: ModuleNode[]
): UnifiedGraph {
  const symbolMap = new Map<string, ModuleNode>()
  for (const node of symbolNodes) {
    symbolMap.set(node.path, node)
  }

  const enrichedModules: ModuleNode[] = importGraph.modules.map(mod => {
    const symbolData = symbolMap.get(mod.path)
    if (!symbolData) return mod

    return {
      ...mod,
      exports: symbolData.exports.length > 0 ? symbolData.exports : mod.exports,
      directives: symbolData.directives.length > 0 ? symbolData.directives : mod.directives,
      role: symbolData.role ?? mod.role ?? classifyRole(mod, symbolData),
      lineCount: symbolData.lineCount ?? mod.lineCount,
    }
  })

  const dirMap = new Map<string, string[]>()
  for (const mod of enrichedModules) {
    const parts = mod.path.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
    const group = dirMap.get(dir) ?? []
    group.push(mod.path)
    dirMap.set(dir, group)
  }

  const directoryGroups: DirectoryGroup[] = []
  for (const [dir, files] of dirMap) {
    const fileSet = new Set(files)
    let incoming = 0
    let outgoing = 0

    for (const edge of importGraph.edges) {
      const sourceInDir = fileSet.has(edge.source)
      const targetInDir = fileSet.has(edge.target)

      if (sourceInDir && !targetInDir) outgoing++
      if (!sourceInDir && targetInDir) incoming++
    }

    directoryGroups.push({ directory: dir, files, incomingEdges: incoming, outgoingEdges: outgoing })
  }

  return {
    modules: enrichedModules,
    edges: importGraph.edges,
    directoryGroups,
  }
}

function classifyRole(mod: ModuleNode, symbolData?: ModuleNode): ModuleRole {
  if (symbolData?.directives.includes('use client')) return 'component'
  if (symbolData?.directives.includes('use server')) return 'service'

  const exports = symbolData?.exports ?? mod.exports

  if (exports.some(e => e.kind === 'class' && (e.name.includes('Service') || e.name.includes('Client')))) {
    return 'service'
  }
  if (exports.some(e => e.kind === 'class')) return 'service'
  if (exports.some(e => e.kind === 'hook')) return 'hook'
  if (exports.some(e => e.kind === 'component')) return 'component'
  if (exports.some(e => e.kind === 'context')) return 'context'
  if (exports.length > 0 && exports.every(e => e.kind === 'type' || e.kind === 'interface')) return 'type'
  if (mod.isBarrel) return 'util'

  return 'util'
}
