import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk-api.js'
import type {
  ArchitectureGraph,
  LayoutedDiagram,
  LayoutNode,
  LayoutEdge,
  LayoutZone,
  LayoutDirection,
} from '../types.js'

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase()
}

const ROLE_COLORS: Record<string, string> = {
  frontend: '#a5d8ff',
  backend: '#eebefa',
  shared: '#e9ecef',
  external: '#ffd8a8',
  data: '#99e9f2',
}

export interface LayoutConfig {
  direction?: LayoutDirection
}

export async function computeLayout(
  archGraph: ArchitectureGraph,
  config: LayoutConfig = {}
): Promise<LayoutedDiagram> {
  const direction = config.direction ?? 'RIGHT'
  const elk = new ELK()

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: archGraph.groups.map(g => ({
      id: sanitizeId(g.name),
      width: Math.max(160, g.name.length * 9),
      height: 80,
    })),
    edges: archGraph.relationships.map(r => ({
      id: `${sanitizeId(r.from)}_to_${sanitizeId(r.to)}`,
      sources: [sanitizeId(r.from)],
      targets: [sanitizeId(r.to)],
    })),
  }

  const layouted = await elk.layout(elkGraph)

  const nodes: LayoutNode[] = (layouted.children ?? []).map((child: ElkNode, i: number) => {
    const group = archGraph.groups[i]
    return {
      id: child.id ?? '',
      x: child.x ?? 0,
      y: child.y ?? 0,
      width: child.width ?? 160,
      height: child.height ?? 80,
      label: group?.name ?? (child.id ?? ''),
      group: group?.role,
      color: ROLE_COLORS[group?.role ?? 'shared'] ?? '#e9ecef',
    }
  })

  const edges: LayoutEdge[] = (layouted.edges ?? []).map((edge: ElkExtendedEdge, i: number) => {
    const rel = archGraph.relationships[i]
    const bendPoints: Array<{ x: number; y: number }> = edge.sections?.[0]?.bendPoints ?? []
    return {
      id: edge.id ?? '',
      sourceId: edge.sources?.[0] ?? '',
      targetId: edge.targets?.[0] ?? '',
      label: rel?.label,
      bendPoints: bendPoints.map(bp => ({ x: bp.x, y: bp.y })),
    }
  })

  const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + n.width)) : 0
  const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + n.height)) : 0

  const roleNodes = new Map<string, LayoutNode[]>()
  for (const node of nodes) {
    const role = node.group ?? 'shared'
    const roleGroup = roleNodes.get(role) ?? []
    roleGroup.push(node)
    roleNodes.set(role, roleGroup)
  }

  const PADDING = 40
  const zones: LayoutZone[] = Array.from(roleNodes.entries()).map(([role, roleNodeList]) => {
    const minX = Math.min(...roleNodeList.map(n => n.x)) - PADDING
    const minY = Math.min(...roleNodeList.map(n => n.y)) - PADDING
    const maxZoneX = Math.max(...roleNodeList.map(n => n.x + n.width)) + PADDING
    const maxZoneY = Math.max(...roleNodeList.map(n => n.y + n.height)) + PADDING

    return {
      id: `zone_${role}`,
      x: Math.max(0, minX),
      y: Math.max(0, minY),
      width: maxZoneX - Math.max(0, minX),
      height: maxZoneY - Math.max(0, minY),
      label: role.charAt(0).toUpperCase() + role.slice(1),
      color: ROLE_COLORS[role] ?? '#e9ecef',
    }
  })

  return { nodes, edges, width: maxX, height: maxY, zones }
}
