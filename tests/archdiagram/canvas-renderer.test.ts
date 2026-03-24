import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToCanvas, getCanvasInstructions, buildCanvasElements } from '../../scripts/archdiagram/renderers/canvas.js'
import type { LayoutedDiagram } from '../../scripts/archdiagram/types.js'

function makeSimpleDiagram(): LayoutedDiagram {
  return {
    nodes: [
      { id: 'node_a', x: 100, y: 100, width: 160, height: 60, label: 'ServiceA', group: 'backend' },
      { id: 'node_b', x: 400, y: 100, width: 160, height: 60, label: 'ServiceB', group: 'frontend' },
    ],
    edges: [
      { id: 'edge_ab', sourceId: 'node_a', targetId: 'node_b', label: 'calls' },
    ],
    zones: [
      { id: 'z1', x: 80, y: 80, width: 500, height: 100, label: 'Backend Zone', color: '#eebefa' },
    ],
    width: 640,
    height: 300,
  }
}

describe('renderToCanvas — no canvas running (ECONNREFUSED simulation)', () => {
  beforeEach(() => {
    const connRefused = Object.assign(new Error('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3444'), { code: 'ECONNREFUSED' }),
    })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(connRefused))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns success=false without throwing when ECONNREFUSED', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderToCanvas(diagram)
    expect(result.format).toBe('canvas')
    expect(result.filePath).toBe('')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Canvas not available')
  })

  it('does not throw even for empty diagram when canvas unavailable', async () => {
    const empty: LayoutedDiagram = { nodes: [], edges: [], zones: [], width: 0, height: 0 }
    await expect(renderToCanvas(empty)).resolves.not.toThrow()
    const result = await renderToCanvas(empty)
    expect(result.format).toBe('canvas')
    expect(result.success).toBe(false)
  })
})

describe('buildCanvasElements', () => {
  it('includes a rectangle for each node with correct id and coords', () => {
    const diagram = makeSimpleDiagram()
    const elements = buildCanvasElements(diagram)

    const nodeA = elements.find(e => e.id === 'node_a' && e.type === 'rectangle')
    expect(nodeA).toBeDefined()
    expect(nodeA?.x).toBe(100)
    expect(nodeA?.y).toBe(100)
    expect(nodeA?.width).toBe(160)
    expect(nodeA?.height).toBe(60)
  })

  it('includes zone rectangles with zone_ prefix and low opacity', () => {
    const diagram = makeSimpleDiagram()
    const elements = buildCanvasElements(diagram)

    const zone = elements.find(e => e.id === 'zone_z1' && e.type === 'rectangle')
    expect(zone).toBeDefined()
    expect(zone?.opacity).toBe(10)
    expect(zone?.backgroundColor).toBe('#eebefa')
  })

  it('includes arrows with startElementId and endElementId', () => {
    const diagram = makeSimpleDiagram()
    const elements = buildCanvasElements(diagram)

    const arrow = elements.find(e => e.id === 'edge_ab' && e.type === 'arrow')
    expect(arrow).toBeDefined()
    expect(arrow?.startElementId).toBe('node_a')
    expect(arrow?.endElementId).toBe('node_b')
  })

  it('uses default backgroundColor for nodes without color', () => {
    const diagram: LayoutedDiagram = {
      nodes: [{ id: 'n1', x: 0, y: 0, width: 100, height: 50, label: 'X' }],
      edges: [],
      zones: [],
      width: 200,
      height: 100,
    }
    const elements = buildCanvasElements(diagram)
    const node = elements.find(e => e.id === 'n1')
    expect(node?.backgroundColor).toBe('#e9ecef')
  })

  it('total element count equals zones + nodes + edges', () => {
    const diagram = makeSimpleDiagram()
    const elements = buildCanvasElements(diagram)
    const expected = diagram.zones.length + diagram.nodes.length + diagram.edges.length
    expect(elements.length).toBe(expected)
  })
})

describe('getCanvasInstructions', () => {
  it('returns a non-empty string', () => {
    const instructions = getCanvasInstructions()
    expect(typeof instructions).toBe('string')
    expect(instructions.length).toBeGreaterThan(0)
  })

  it('contains key instruction steps', () => {
    const instructions = getCanvasInstructions()
    expect(instructions).toContain('start-excalidraw-canvas.sh')
    expect(instructions).toContain('create_from_mermaid')
    expect(instructions).toContain('export_scene')
  })

  it('mentions docs/architecture as save target', () => {
    const instructions = getCanvasInstructions()
    expect(instructions).toContain('docs/architecture/')
  })
})

describe('renderToCanvas — mocked fetch', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls clear, batch, and viewport endpoints in order', async () => {
    fetchSpy.mockResolvedValue({ ok: true })

    const diagram = makeSimpleDiagram()
    const result = await renderToCanvas(diagram)

    expect(result.success).toBe(true)
    expect(result.format).toBe('canvas')
    expect(result.filePath).toBe('')

    const calls = fetchSpy.mock.calls
    expect(calls[0][0]).toContain('/api/clear')
    expect(calls[0][1].method).toBe('POST')

    expect(calls[1][0]).toContain('/api/elements/batch')
    expect(calls[1][1].method).toBe('POST')
    expect(calls[1][1].headers['Content-Type']).toBe('application/json')

    const batchBody = JSON.parse(calls[1][1].body as string) as unknown[]
    expect(Array.isArray(batchBody)).toBe(true)
    expect(batchBody.length).toBeGreaterThan(0)

    expect(calls[2][0]).toContain('/api/viewport')
    const viewportBody = JSON.parse(calls[2][1].body as string) as Record<string, unknown>
    expect(viewportBody.scrollToContent).toBe(true)
  })

  it('batch body contains elements with expected fields', async () => {
    fetchSpy.mockResolvedValue({ ok: true })

    const diagram = makeSimpleDiagram()
    await renderToCanvas(diagram)

    const batchCall = fetchSpy.mock.calls[1]
    const elements = JSON.parse(batchCall[1].body as string) as Array<Record<string, unknown>>

    const nodeEl = elements.find(e => e.id === 'node_a')
    expect(nodeEl).toBeDefined()
    expect(nodeEl?.type).toBe('rectangle')
    expect(nodeEl?.x).toBe(100)
    expect(nodeEl?.y).toBe(100)
    expect(nodeEl?.strokeColor).toBeDefined()

    const arrowEl = elements.find(e => e.id === 'edge_ab')
    expect(arrowEl?.type).toBe('arrow')
    expect(arrowEl?.startElementId).toBe('node_a')
    expect(arrowEl?.endElementId).toBe('node_b')
  })

  it('returns success=false with error message on non-ECONNREFUSED fetch failure', async () => {
    fetchSpy.mockRejectedValue(new Error('network timeout'))

    const result = await renderToCanvas(makeSimpleDiagram())
    expect(result.success).toBe(false)
    expect(result.error).toContain('network timeout')
  })
})
