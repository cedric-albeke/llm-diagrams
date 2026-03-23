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

interface RoleColor {
  fill: string
  stroke: string
}

const ROLE_COLORS: Record<string, RoleColor> = {
  frontend: { fill: '#a5d8ff', stroke: '#1971c2' },
  backend: { fill: '#eebefa', stroke: '#862e9c' },
  shared: { fill: '#e9ecef', stroke: '#495057' },
  external: { fill: '#ffd8a8', stroke: '#e67700' },
  data: { fill: '#99e9f2', stroke: '#0c8599' },
}

const DEFAULT_COLORS: RoleColor = ROLE_COLORS.shared

function buildZoneRect(zone: LayoutZone): ExcalidrawRectangle {
  return {
    id: `zone_${zone.id}`,
    type: 'rectangle',
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    strokeColor: zone.color,
    backgroundColor: zone.color,
    opacity: 10,
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

function buildNodeRect(node: LayoutNode): ExcalidrawRectangle {
  const roleColors = ROLE_COLORS[node.group ?? 'shared'] ?? DEFAULT_COLORS
  return {
    id: node.id,
    type: 'rectangle',
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    strokeColor: roleColors.stroke,
    backgroundColor: roleColors.fill,
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

function buildArrow(edge: LayoutEdge, sourceNode: LayoutNode, targetNode: LayoutNode): ExcalidrawArrow {
  const arrowX = sourceNode.x + sourceNode.width
  const arrowY = sourceNode.y + sourceNode.height / 2
  const dx = targetNode.x - arrowX
  const dy = (targetNode.y + targetNode.height / 2) - arrowY

  return {
    id: edge.id,
    type: 'arrow',
    x: arrowX,
    y: arrowY,
    width: Math.abs(dx),
    height: Math.abs(dy),
    points: [[0, 0], [dx, dy]],
    startBinding: { elementId: edge.sourceId, focus: 0, gap: 5 },
    endBinding: { elementId: edge.targetId, focus: 0, gap: 5 },
    startArrowhead: null,
    endArrowhead: 'arrow',
    strokeWidth: 2,
    roughness: 0,
  }
}

export async function renderExcalidraw(
  diagram: LayoutedDiagram,
  outputDir: string,
  filename = 'system-overview'
): Promise<RenderResult> {
  try {
    const elements: ExcalidrawElement[] = []

    for (const zone of diagram.zones) {
      elements.push(buildZoneRect(zone))
      elements.push(buildZoneLabel(zone))
    }

    for (const node of diagram.nodes) {
      elements.push(buildNodeRect(node))
      elements.push(buildNodeLabel(node))
    }

    for (const edge of diagram.edges) {
      const sourceNode = diagram.nodes.find(n => n.id === edge.sourceId)
      const targetNode = diagram.nodes.find(n => n.id === edge.targetId)
      if (!sourceNode || !targetNode) continue
      elements.push(buildArrow(edge, sourceNode, targetNode))
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
