import fs from 'fs'
import path from 'path'
import type { LayoutedDiagram, LayoutNode, LayoutEdge, LayoutZone, RenderResult } from '../types.js'

interface ExcalidrawRoundness {
  type: number
}

interface ExcalidrawRectangle {
  id: string
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  backgroundColor: string
  opacity: number
  strokeWidth: number
  roughness: number
  fillStyle: 'solid'
  roundness: ExcalidrawRoundness | null
}

interface ExcalidrawText {
  id: string
  type: 'text'
  x: number
  y: number
  width?: number
  height?: number
  text: string
  fontSize: number
  fontFamily: 1
  textAlign: 'center' | 'left'
  verticalAlign: 'middle' | 'top'
}

interface ExcalidrawBinding {
  elementId: string
  focus: number
  gap: number
}

interface ExcalidrawArrow {
  id: string
  type: 'arrow'
  x: number
  y: number
  width: number
  height: number
  points: [number, number][]
  startBinding: ExcalidrawBinding
  endBinding: ExcalidrawBinding
  startArrowhead: null
  endArrowhead: 'arrow'
  strokeWidth: number
  roughness: number
}

type ExcalidrawElement = ExcalidrawRectangle | ExcalidrawText | ExcalidrawArrow

interface ExcalidrawScene {
  type: 'excalidraw'
  version: 2
  elements: ExcalidrawElement[]
  appState: { gridSize: number; viewBackgroundColor: string }
}

interface NodeColor {
  fill: string
  stroke: string
}

interface Positioned {
  id: string
  x: number
  y: number
  width: number
  height: number
}

const ROLE_COLORS: Record<string, NodeColor> = {
  frontend: { fill: '#a5d8ff', stroke: '#1971c2' },
  backend: { fill: '#eebefa', stroke: '#862e9c' },
  shared: { fill: '#e9ecef', stroke: '#495057' },
  external: { fill: '#ffd8a8', stroke: '#e67700' },
  data: { fill: '#99e9f2', stroke: '#0c8599' },
}

const GROUP_COLORS: NodeColor[] = [
  { fill: '#a5d8ff', stroke: '#1971c2' },
  { fill: '#eebefa', stroke: '#862e9c' },
  { fill: '#b2f2bb', stroke: '#2b8a3e' },
  { fill: '#ffd8a8', stroke: '#e67700' },
  { fill: '#99e9f2', stroke: '#0c8599' },
  { fill: '#ffc9c9', stroke: '#c92a2a' },
  { fill: '#e9ecef', stroke: '#495057' },
]

const DEFAULT_COLORS: NodeColor = { fill: '#e9ecef', stroke: '#495057' }

function getNodeColors(node: LayoutNode, zones: LayoutZone[]): NodeColor {
  if (node.group && node.group in ROLE_COLORS) {
    return ROLE_COLORS[node.group]
  }
  const zoneIndex = zones.findIndex(z => z.label === node.group)
  if (zoneIndex >= 0) {
    return GROUP_COLORS[zoneIndex % GROUP_COLORS.length]
  }
  return DEFAULT_COLORS
}

function findPositioned(id: string, nodes: LayoutNode[], zones: LayoutZone[]): Positioned | undefined {
  const node = nodes.find(n => n.id === id)
  if (node) return node
  const zone = zones.find(z => `zone_${z.id}` === id)
  if (zone) return { id, x: zone.x, y: zone.y, width: zone.width, height: zone.height }
  return undefined
}

function buildZoneRect(zone: LayoutZone, colors: NodeColor): ExcalidrawRectangle {
  return {
    id: `zone_${zone.id}`,
    type: 'rectangle',
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    strokeColor: colors.stroke,
    backgroundColor: colors.fill,
    opacity: 20,
    strokeWidth: 1,
    roughness: 0,
    fillStyle: 'solid',
    roundness: null,
  }
}

function buildZoneLabel(zone: LayoutZone): ExcalidrawText {
  return {
    id: `zone_${zone.id}_label`,
    type: 'text',
    x: zone.x + 8,
    y: zone.y + 4,
    text: zone.label,
    fontSize: 14,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
  }
}

function buildNodeRect(node: LayoutNode, colors: NodeColor): ExcalidrawRectangle {
  return {
    id: node.id,
    type: 'rectangle',
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    strokeColor: colors.stroke,
    backgroundColor: colors.fill,
    opacity: 100,
    strokeWidth: 2,
    roughness: 0,
    fillStyle: 'solid',
    roundness: { type: 3 },
  }
}

function buildNodeLabel(node: LayoutNode): ExcalidrawText {
  return {
    id: `${node.id}_label`,
    type: 'text',
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    text: node.label,
    fontSize: 16,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
  }
}

function buildArrow(edge: LayoutEdge, source: Positioned, target: Positioned): ExcalidrawArrow {
  const arrowX = source.x + source.width
  const arrowY = source.y + source.height / 2
  const dx = target.x - arrowX
  const dy = (target.y + target.height / 2) - arrowY

  return {
    id: edge.id,
    type: 'arrow',
    x: arrowX,
    y: arrowY,
    width: Math.abs(dx),
    height: Math.abs(dy),
    points: [[0, 0], [dx, dy]],
    startBinding: { elementId: source.id, focus: 0, gap: 5 },
    endBinding: { elementId: target.id, focus: 0, gap: 5 },
    startArrowhead: null,
    endArrowhead: 'arrow',
    strokeWidth: 2,
    roughness: 0,
  }
}

function buildEdgeLabel(edge: LayoutEdge, source: Positioned, target: Positioned): ExcalidrawText {
  const midX = (source.x + source.width / 2 + target.x + target.width / 2) / 2
  const midY = (source.y + source.height / 2 + target.y + target.height / 2) / 2
  return {
    id: `${edge.id}_label`,
    type: 'text',
    x: midX - 30,
    y: midY - 10,
    text: edge.label ?? '',
    fontSize: 12,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
  }
}

export async function renderExcalidraw(
  diagram: LayoutedDiagram,
  outputDir: string,
  filename = 'system-overview'
): Promise<RenderResult> {
  try {
    const elements: ExcalidrawElement[] = []

    diagram.zones.forEach((zone, zi) => {
      const colors = GROUP_COLORS[zi % GROUP_COLORS.length]
      elements.push(buildZoneRect(zone, colors))
      elements.push(buildZoneLabel(zone))
    })

    for (const node of diagram.nodes) {
      const colors = getNodeColors(node, diagram.zones)
      elements.push(buildNodeRect(node, colors))
      elements.push(buildNodeLabel(node))
    }

    for (const edge of diagram.edges) {
      const source = findPositioned(edge.sourceId, diagram.nodes, diagram.zones)
      const target = findPositioned(edge.targetId, diagram.nodes, diagram.zones)
      if (!source || !target) continue
      elements.push(buildArrow(edge, source, target))
      if (edge.label) {
        elements.push(buildEdgeLabel(edge, source, target))
      }
    }

    const scene: ExcalidrawScene = {
      type: 'excalidraw',
      version: 2,
      elements,
      appState: {
        gridSize: 20,
        viewBackgroundColor: '#ffffff',
      },
    }

    fs.mkdirSync(outputDir, { recursive: true })
    const filePath = path.join(outputDir, `${filename}.excalidraw`)
    fs.writeFileSync(filePath, JSON.stringify(scene, null, 2))

    return { format: 'excalidraw', filePath, success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { format: 'excalidraw', filePath: '', success: false, error }
  }
}
