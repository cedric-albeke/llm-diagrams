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

    interface EdgeRoute {
      edge: LayoutEdge
      sourceZone: LayoutZone
      targetZone: LayoutZone
      srcSide: string
      tgtSide: string
    }

    const routes: EdgeRoute[] = []
    for (const edge of diagram.edges) {
      const sourceZone = diagram.zones.find(z => `zone_${z.id}` === edge.sourceId)
      const targetZone = diagram.zones.find(z => `zone_${z.id}` === edge.targetId)
      if (!sourceZone || !targetZone) continue

      const dx = (targetZone.x + targetZone.width / 2) - (sourceZone.x + sourceZone.width / 2)
      const dy = (targetZone.y + targetZone.height / 2) - (sourceZone.y + sourceZone.height / 2)
      const horizontal = Math.abs(dx) > Math.abs(dy)
      const srcSide = horizontal ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top')
      const tgtSide = horizontal ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'top' : 'bottom')
      routes.push({ edge, sourceZone, targetZone, srcSide, tgtSide })
    }

    const portCounts = new Map<string, number>()
    const portUsed = new Map<string, number>()
    for (const r of routes) {
      const sk = `${r.edge.sourceId}:${r.srcSide}`
      const tk = `${r.edge.targetId}:${r.tgtSide}`
      portCounts.set(sk, (portCounts.get(sk) ?? 0) + 1)
      portCounts.set(tk, (portCounts.get(tk) ?? 0) + 1)
    }

    const pairIndex = new Map<string, number>()

    for (const r of routes) {
      const { edge, sourceZone, targetZone, srcSide, tgtSide } = r
      const sk = `${edge.sourceId}:${srcSide}`
      const tk = `${edge.targetId}:${tgtSide}`
      const si = portUsed.get(sk) ?? 0
      const ti = portUsed.get(tk) ?? 0
      portUsed.set(sk, si + 1)
      portUsed.set(tk, ti + 1)
      const sTotal = portCounts.get(sk) ?? 1
      const tTotal = portCounts.get(tk) ?? 1

      const pairKey = [edge.sourceId, edge.targetId].sort().join('|')
      const pi = pairIndex.get(pairKey) ?? 0
      pairIndex.set(pairKey, pi + 1)

      function portPos(zone: LayoutZone, side: string, idx: number, total: number): { x: number; y: number } {
        const margin = 40
        if (side === 'right' || side === 'left') {
          const span = zone.height - 2 * margin
          const offset = total > 1 ? margin + span * idx / (total - 1) : zone.height / 2
          return { x: side === 'right' ? zone.x + zone.width : zone.x, y: zone.y + offset }
        }
        const span = zone.width - 2 * margin
        const offset = total > 1 ? margin + span * idx / (total - 1) : zone.width / 2
        return { x: zone.x + offset, y: side === 'bottom' ? zone.y + zone.height : zone.y }
      }

      const start = portPos(sourceZone, srcSide, si, sTotal)
      const end = portPos(targetZone, tgtSide, ti, tTotal)
      const adx = end.x - start.x
      const ady = end.y - start.y

      const gap = 30 + pi * 25
      let points: [number, number][]
      let labelAnchorX: number
      let labelAnchorY: number

      if (srcSide === 'right' && tgtSide === 'left') {
        const mx = gap
        points = [[0, 0], [mx, 0], [mx, ady], [adx, ady]]
        labelAnchorX = start.x + mx
        labelAnchorY = start.y + ady / 2
      } else if (srcSide === 'left' && tgtSide === 'right') {
        const mx = -gap
        points = [[0, 0], [mx, 0], [mx, ady], [adx, ady]]
        labelAnchorX = start.x + mx
        labelAnchorY = start.y + ady / 2
      } else if (srcSide === 'bottom' && tgtSide === 'top') {
        const my = gap
        points = [[0, 0], [0, my], [adx, my], [adx, ady]]
        labelAnchorX = start.x + adx / 2
        labelAnchorY = start.y + my
      } else if (srcSide === 'top' && tgtSide === 'bottom') {
        const my = -gap
        points = [[0, 0], [0, my], [adx, my], [adx, ady]]
        labelAnchorX = start.x + adx / 2
        labelAnchorY = start.y + my
      } else {
        points = [[0, 0], [adx, ady]]
        labelAnchorX = start.x + adx / 2
        labelAnchorY = start.y + ady / 2
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
        const isVerticalSeg = srcSide === 'right' || srcSide === 'left'
        const lx = labelAnchorX + (isVerticalSeg ? 8 : -labelWidth / 2)
        const ly = labelAnchorY + (isVerticalSeg ? -12 : -20)

        elements.push({
          id: `${edge.id}_bg`,
          type: 'rectangle',
          x: lx,
          y: ly,
          width: labelWidth,
          height: 22,
          strokeColor: 'transparent',
          backgroundColor: '#ffffff',
          opacity: 95,
          strokeWidth: 0,
          roughness: 0,
          fillStyle: 'solid',
          roundness: { type: 3 },
        })

        elements.push({
          id: `${edge.id}_label`,
          type: 'text',
          x: lx,
          y: ly,
          width: labelWidth,
          height: 22,
          text: labelText,
          fontSize: 11,
          fontFamily: 2,
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
