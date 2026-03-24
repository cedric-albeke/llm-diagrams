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
  startBinding: ExcalidrawBinding | null
  endBinding: ExcalidrawBinding | null
  startArrowhead: null
  endArrowhead: 'arrow'
  strokeWidth: number
  strokeColor: string
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

const GROUP_COLORS: NodeColor[] = [
  { fill: '#dbe4ff', stroke: '#364fc7' },
  { fill: '#e5dbff', stroke: '#6741d9' },
  { fill: '#d3f9d8', stroke: '#2b8a3e' },
  { fill: '#fff3bf', stroke: '#e67700' },
  { fill: '#c3fae8', stroke: '#087f5b' },
  { fill: '#ffc9c9', stroke: '#c92a2a' },
  { fill: '#e9ecef', stroke: '#495057' },
]

const NODE_COLORS: NodeColor[] = [
  { fill: '#a5d8ff', stroke: '#1971c2' },
  { fill: '#d0bfff', stroke: '#7048e8' },
  { fill: '#b2f2bb', stroke: '#2f9e44' },
  { fill: '#ffd8a8', stroke: '#e67700' },
  { fill: '#96f2d7', stroke: '#0ca678' },
  { fill: '#ffa8a8', stroke: '#e03131' },
  { fill: '#dee2e6', stroke: '#495057' },
]

export async function renderExcalidraw(
  diagram: LayoutedDiagram,
  outputDir: string,
  filename = 'system-overview'
): Promise<RenderResult> {
  try {
    const elements: ExcalidrawElement[] = []

    diagram.zones.forEach((zone, zi) => {
      const colors = GROUP_COLORS[zi % GROUP_COLORS.length]

      elements.push({
        id: `zone_${zone.id}`,
        type: 'rectangle',
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        strokeColor: colors.stroke,
        backgroundColor: colors.fill,
        opacity: 30,
        strokeWidth: 2,
        roughness: 0,
        fillStyle: 'solid',
        roundness: { type: 3 },
      })

      elements.push({
        id: `zone_${zone.id}_label`,
        type: 'text',
        x: zone.x + 12,
        y: zone.y + 8,
        text: zone.label.toUpperCase(),
        fontSize: 18,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
      })
    })

    for (const node of diagram.nodes) {
      const zi = diagram.zones.findIndex(z => z.label === node.group)
      const colors = NODE_COLORS[zi >= 0 ? zi % NODE_COLORS.length : 0]

      elements.push({
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
      })

      elements.push({
        id: `${node.id}_label`,
        type: 'text',
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        text: node.label,
        fontSize: 14,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
      })
    }

    for (const edge of diagram.edges) {
      const sourceZone = diagram.zones.find(z => `zone_${z.id}` === edge.sourceId)
      const targetZone = diagram.zones.find(z => `zone_${z.id}` === edge.targetId)
      if (!sourceZone || !targetZone) continue

      const srcCx = sourceZone.x + sourceZone.width / 2
      const srcCy = sourceZone.y + sourceZone.height / 2
      const tgtCx = targetZone.x + targetZone.width / 2
      const tgtCy = targetZone.y + targetZone.height / 2

      const dx = tgtCx - srcCx
      const dy = tgtCy - srcCy

      let startX: number, startY: number, endX: number, endY: number

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          startX = sourceZone.x + sourceZone.width
          startY = srcCy
          endX = targetZone.x
          endY = tgtCy
        } else {
          startX = sourceZone.x
          startY = srcCy
          endX = targetZone.x + targetZone.width
          endY = tgtCy
        }
      } else {
        if (dy > 0) {
          startX = srcCx
          startY = sourceZone.y + sourceZone.height
          endX = tgtCx
          endY = targetZone.y
        } else {
          startX = srcCx
          startY = sourceZone.y
          endX = tgtCx
          endY = targetZone.y + targetZone.height
        }
      }

      const adx = endX - startX
      const ady = endY - startY

      elements.push({
        id: edge.id,
        type: 'arrow',
        x: startX,
        y: startY,
        width: Math.abs(adx),
        height: Math.abs(ady),
        points: [[0, 0], [adx, ady]],
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        strokeWidth: 2,
        strokeColor: '#495057',
        roughness: 0,
      })

      if (edge.label) {
        const labelX = startX + adx / 2
        const labelY = startY + ady / 2
        const labelText = edge.label
        const labelWidth = labelText.length * 7 + 16

        elements.push({
          id: `${edge.id}_bg`,
          type: 'rectangle',
          x: labelX - labelWidth / 2,
          y: labelY - 12,
          width: labelWidth,
          height: 24,
          strokeColor: 'transparent',
          backgroundColor: '#ffffff',
          opacity: 90,
          strokeWidth: 0,
          roughness: 0,
          fillStyle: 'solid',
          roundness: { type: 3 },
        })

        elements.push({
          id: `${edge.id}_label`,
          type: 'text',
          x: labelX - labelWidth / 2,
          y: labelY - 12,
          width: labelWidth,
          height: 24,
          text: labelText,
          fontSize: 12,
          fontFamily: 1,
          textAlign: 'center',
          verticalAlign: 'middle',
        })
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
