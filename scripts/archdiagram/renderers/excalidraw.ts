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
  fontFamily: number
  fontWeight?: number
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

      const titleText = zone.label.toUpperCase()
      const titleWidth = titleText.length * 13 + 20
      const titleHeight = 30

      elements.push({
        id: `zone_${zone.id}_label`,
        type: 'text',
        x: zone.x + 14,
        y: zone.y + 12,
        width: titleWidth,
        height: titleHeight,
        text: titleText,
        fontSize: 20,
        fontFamily: 2,
        fontWeight: 700,
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
        fontFamily: 2,
        textAlign: 'center',
        verticalAlign: 'middle',
      })
    }

    const portSlots = new Map<string, { side: string; count: number; used: number }>()

    function getPortKey(zoneId: string, side: string): string {
      return `${zoneId}:${side}`
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
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const srcSide = horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top')
      const tgtSide = horizontal ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'top' : 'bottom')

      const srcKey = getPortKey(edge.sourceId, srcSide)
      const tgtKey = getPortKey(edge.targetId, tgtSide)
      if (!portSlots.has(srcKey)) portSlots.set(srcKey, { side: srcSide, count: 0, used: 0 })
      if (!portSlots.has(tgtKey)) portSlots.set(tgtKey, { side: tgtSide, count: 0, used: 0 })
      portSlots.get(srcKey)!.count++
      portSlots.get(tgtKey)!.count++
    }

    let edgeIndex = 0
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
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const srcSide = horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top')
      const tgtSide = horizontal ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'top' : 'bottom')

      const srcSlot = portSlots.get(getPortKey(edge.sourceId, srcSide))!
      const tgtSlot = portSlots.get(getPortKey(edge.targetId, tgtSide))!
      const srcIdx = srcSlot.used++
      const tgtIdx = tgtSlot.used++

      function distributeAlongEdge(
        zone: LayoutZone, side: string, idx: number, total: number
      ): { x: number; y: number } {
        const margin = 30
        if (side === 'right' || side === 'left') {
          const span = zone.height - 2 * margin
          const step = total > 1 ? span / (total - 1) : 0
          const py = zone.y + margin + step * idx
          return { x: side === 'right' ? zone.x + zone.width : zone.x, y: py }
        }
        const span = zone.width - 2 * margin
        const step = total > 1 ? span / (total - 1) : 0
        const px = zone.x + margin + step * idx
        return { x: px, y: side === 'bottom' ? zone.y + zone.height : zone.y }
      }

      const start = distributeAlongEdge(sourceZone, srcSide, srcIdx, srcSlot.count)
      const end = distributeAlongEdge(targetZone, tgtSide, tgtIdx, tgtSlot.count)

      const adx = end.x - start.x
      const ady = end.y - start.y

      const staggerOffset = (edgeIndex - diagram.edges.length / 2) * 30

      let points: [number, number][]
      if (horizontal) {
        const midX = adx / 2 + staggerOffset
        points = [[0, 0], [midX, 0], [midX, ady], [adx, ady]]
      } else {
        const midY = ady / 2 + staggerOffset
        points = [[0, 0], [0, midY], [adx, midY], [adx, ady]]
      }

      elements.push({
        id: edge.id,
        type: 'arrow',
        x: start.x,
        y: start.y,
        width: Math.abs(adx),
        height: Math.abs(ady),
        points,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        strokeWidth: 2,
        strokeColor: '#868e96',
        roughness: 0,
      })

      if (edge.label) {
        const labelText = edge.label
        const labelWidth = labelText.length * 7 + 16
        const sourceZone = diagram.zones.find(z => `zone_${z.id}` === edge.sourceId)

        let lx: number
        let ly: number

        if (sourceZone) {
          const srcSide = horizontal ? (adx > 0 ? 'right' : 'left') : (ady > 0 ? 'bottom' : 'top')
          if (srcSide === 'right') {
            lx = sourceZone.x + sourceZone.width + 6
            ly = start.y - 16
          } else if (srcSide === 'left') {
            lx = sourceZone.x - labelWidth - 6
            ly = start.y - 16
          } else if (srcSide === 'bottom') {
            lx = start.x + 6
            ly = sourceZone.y + sourceZone.height + 4
          } else {
            lx = start.x + 6
            ly = sourceZone.y - 20
          }
        } else {
          lx = start.x + adx / 2 - labelWidth / 2
          ly = start.y + ady / 2 - 10
        }

        elements.push({
          id: `${edge.id}_label`,
          type: 'text',
          x: lx,
          y: ly,
          width: labelWidth,
          height: 20,
          text: labelText,
          fontSize: 11,
          fontFamily: 2,
          textAlign: 'center',
          verticalAlign: 'middle',
        })
      }

      edgeIndex++
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
