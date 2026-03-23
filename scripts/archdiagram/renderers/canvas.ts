import type { LayoutedDiagram, RenderResult } from '../types.js'

const CANVAS_URL = 'http://localhost:3111'

interface CanvasElement {
  id: string
  type: 'rectangle' | 'arrow'
  x: number
  y: number
  width: number
  height: number
  backgroundColor?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  text?: string
  startElementId?: string
  endElementId?: string
}

export function buildCanvasElements(diagram: LayoutedDiagram): CanvasElement[] {
  const elements: CanvasElement[] = []

  for (const zone of diagram.zones) {
    elements.push({
      id: `zone_${zone.id}`,
      type: 'rectangle',
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      backgroundColor: zone.color,
      strokeColor: zone.color,
      opacity: 10,
      strokeWidth: 1,
    })
  }

  for (const node of diagram.nodes) {
    elements.push({
      id: node.id,
      type: 'rectangle',
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      text: node.label,
      backgroundColor: node.color ?? '#e9ecef',
      strokeColor: '#495057',
      strokeWidth: 2,
    })
  }

  for (const edge of diagram.edges) {
    elements.push({
      id: edge.id,
      type: 'arrow',
      x: 0,
      y: 0,
      width: 100,
      height: 0,
      startElementId: edge.sourceId,
      endElementId: edge.targetId,
    })
  }

  return elements
}

export async function renderToCanvas(diagram: LayoutedDiagram): Promise<RenderResult> {
  try {
    await fetch(`${CANVAS_URL}/api/clear`, { method: 'POST' })

    const elements = buildCanvasElements(diagram)

    await fetch(`${CANVAS_URL}/api/elements/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(elements),
    })

    await fetch(`${CANVAS_URL}/api/viewport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scrollToContent: true }),
    })

    return { format: 'canvas', filePath: '', success: true }
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    const isConnRefused =
      err.code === 'ECONNREFUSED' ||
      (err.cause as NodeJS.ErrnoException | undefined)?.code === 'ECONNREFUSED' ||
      String(e).includes('ECONNREFUSED') ||
      String(e).includes('fetch failed') ||
      String(e).includes('ECONNREFUSED')

    if (isConnRefused) {
      console.warn('[canvas] Canvas not available, skipping')
      return { format: 'canvas', filePath: '', success: false, error: 'Canvas not available' }
    }

    return { format: 'canvas', filePath: '', success: false, error: (e as Error).message }
  }
}

export function getCanvasInstructions(): string {
  return `## Excalidraw Canvas Instructions (Interactive Mode)

1. Start canvas: \`~/.local/share/mcp-servers/start-excalidraw-canvas.sh\`
2. Run static analysis: \`npx tsx scripts/generate-architecture-diagram.ts --mode static --phase analyze-only\`
3. Read the import graph output
4. Use \`create_from_mermaid\` MCP tool with a Mermaid diagram
5. Use \`get_canvas_screenshot\` to verify result
6. Use \`export_scene\` to save .excalidraw JSON to docs/architecture/`
}
