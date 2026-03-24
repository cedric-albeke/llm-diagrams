import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk-api.js'
import path from 'path'
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

const GROUP_COLORS = [
  { fill: '#a5d8ff', stroke: '#1971c2' },
  { fill: '#eebefa', stroke: '#862e9c' },
  { fill: '#b2f2bb', stroke: '#2b8a3e' },
  { fill: '#ffd8a8', stroke: '#e67700' },
  { fill: '#99e9f2', stroke: '#0c8599' },
  { fill: '#ffc9c9', stroke: '#c92a2a' },
  { fill: '#e9ecef', stroke: '#495057' },
]

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
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    },
    children: archGraph.groups.map(group => ({
      id: sanitizeId(group.name),
      layoutOptions: {
        'elk.padding': '[top=50,left=20,bottom=20,right=20]',
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
      },
      children: group.files.map(file => ({
        id: sanitizeId(file),
        width: Math.max(120, path.basename(file, '.ts').replace('.tsx', '').length * 9 + 20),
        height: 40,
        labels: [{ text: path.basename(file, '.ts').replace('.tsx', '') }],
      })),
    })),
    edges: archGraph.relationships.map(r => ({
      id: `${sanitizeId(r.from)}_to_${sanitizeId(r.to)}`,
      sources: [sanitizeId(r.from)],
      targets: [sanitizeId(r.to)],
      labels: r.label ? [{ text: r.label }] : [],
    })),
  }

  const layouted = await elk.layout(elkGraph)
  const layoutedEdges = (layouted.edges ?? []) as ElkExtendedEdge[]

  const nodes: LayoutNode[] = []
  const zones: LayoutZone[] = []

  ;(layouted.children ?? []).forEach((groupNode: ElkNode, gi: number) => {
    const group = archGraph.groups[gi]
    const groupX = groupNode.x ?? 0
    const groupY = groupNode.y ?? 0
    const groupColor = GROUP_COLORS[gi % GROUP_COLORS.length]

    zones.push({
      id: sanitizeId(group.name),
      x: groupX,
      y: groupY,
      width: groupNode.width ?? 200,
      height: groupNode.height ?? 200,
      label: group.name,
      color: groupColor.fill,
    })

    ;(groupNode.children ?? []).forEach((fileNode: ElkNode, fi: number) => {
      const fileAbsX = (fileNode.x ?? 0) + groupX
      const fileAbsY = (fileNode.y ?? 0) + groupY
      const file = group.files[fi]
      const label = file
        ? path.basename(file, '.ts').replace('.tsx', '')
        : (fileNode.id ?? '')

      nodes.push({
        id: fileNode.id ?? `${sanitizeId(group.name)}_file_${fi}`,
        x: fileAbsX,
        y: fileAbsY,
        width: fileNode.width ?? 120,
        height: fileNode.height ?? 40,
        label,
        group: group.name,
        color: groupColor.fill,
      })
    })
  })

  const edges: LayoutEdge[] = archGraph.relationships.map(r => {
    const edgeId = `${sanitizeId(r.from)}_to_${sanitizeId(r.to)}`
    const elkEdge = layoutedEdges.find(e => e.id === edgeId)
    const bendPoints: Array<{ x: number; y: number }> = elkEdge?.sections?.[0]?.bendPoints ?? []
    return {
      id: edgeId,
      sourceId: `zone_${sanitizeId(r.from)}`,
      targetId: `zone_${sanitizeId(r.to)}`,
      label: r.label,
      bendPoints: bendPoints.map(bp => ({ x: bp.x, y: bp.y })),
    }
  })

  const allX = nodes.map(n => n.x + n.width)
  const allY = nodes.map(n => n.y + n.height)
  const zoneXW = zones.map(z => z.x + z.width)
  const zoneYH = zones.map(z => z.y + z.height)
  const maxX = Math.max(0, ...allX, ...zoneXW)
  const maxY = Math.max(0, ...allY, ...zoneYH)

  return { nodes, edges, width: maxX, height: maxY, zones }
}
