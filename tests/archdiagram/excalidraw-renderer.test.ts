import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { renderExcalidraw } from '../../scripts/archdiagram/renderers/excalidraw.js'
import type { LayoutedDiagram } from '../../scripts/archdiagram/types.js'

const OUTPUT_DIR = '/tmp/test-archdiagram-excalidraw'

afterAll(() => {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
})

function makeSimpleDiagram(): LayoutedDiagram {
  return {
    nodes: [
      { id: 'node_a', x: 120, y: 130, width: 160, height: 40, label: 'ServiceA', group: 'Backend' },
      { id: 'node_b', x: 420, y: 130, width: 160, height: 40, label: 'ServiceB', group: 'Frontend' },
    ],
    edges: [
      { id: 'edge_ab', sourceId: 'zone_z_backend', targetId: 'zone_z_frontend', label: '3 imports' },
    ],
    zones: [
      { id: 'z_backend', x: 80, y: 80, width: 240, height: 140, label: 'Backend', color: '#eebefa' },
      { id: 'z_frontend', x: 380, y: 80, width: 240, height: 140, label: 'Frontend', color: '#a5d8ff' },
    ],
    width: 640,
    height: 300,
  }
}

describe('renderExcalidraw', () => {
  it('returns success and writes file', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-diagram')

    expect(result.success).toBe(true)
    expect(result.format).toBe('excalidraw')
    expect(result.filePath).toBe(path.join(OUTPUT_DIR, 'test-diagram.excalidraw'))
    expect(fs.existsSync(result.filePath)).toBe(true)
  })

  it('output is valid excalidraw JSON (type, version, elements)', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-valid')

    const raw = fs.readFileSync(result.filePath, 'utf-8')
    const parsed = JSON.parse(raw)

    expect(parsed.type).toBe('excalidraw')
    expect(parsed.version).toBe(2)
    expect(Array.isArray(parsed.elements)).toBe(true)
    expect(parsed.elements.length).toBeGreaterThan(0)
  })

  it('appState has gridSize and viewBackgroundColor', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-appstate')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))

    expect(parsed.appState.gridSize).toBe(20)
    expect(parsed.appState.viewBackgroundColor).toBe('#ffffff')
  })

  it('node rectangles have correct IDs and properties', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-nodes')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; strokeWidth?: number; roughness?: number }[]

    const nodeRect = elements.find(e => e.id === 'node_a' && e.type === 'rectangle')
    expect(nodeRect).toBeDefined()
    expect(nodeRect?.strokeWidth).toBe(2)
    expect(nodeRect?.roughness).toBe(0)

    const nodeLabel = elements.find(e => e.id === 'node_a_label' && e.type === 'text')
    expect(nodeLabel).toBeDefined()
  })

  it('arrows connect zones and have directional points', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-arrows')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; points?: [number, number][] }[]

    const arrow = elements.find(e => e.id === 'edge_ab' && e.type === 'arrow')
    expect(arrow).toBeDefined()
    expect(arrow?.points?.length).toBeGreaterThanOrEqual(2)
  })

  it('zone rectangles are present with semi-transparent opacity', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-zones')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; opacity?: number }[]

    const zoneRect = elements.find(e => e.id === 'zone_z_backend' && e.type === 'rectangle')
    expect(zoneRect).toBeDefined()
    expect(zoneRect?.opacity).toBe(30)

    const zoneLabel = elements.find(e => e.id === 'zone_z_backend_label' && e.type === 'text')
    expect(zoneLabel).toBeDefined()
  })

  it('zone labels are uppercase and large font', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-zone-labels')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; text?: string; fontSize?: number }[]

    const zoneLabel = elements.find(e => e.id === 'zone_z_backend_label' && e.type === 'text')
    expect(zoneLabel?.text).toBe('BACKEND')
    expect(zoneLabel?.fontSize).toBe(20)
  })

  it('edge labels have white background for readability', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-edge-labels')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; text?: string; backgroundColor?: string }[]

    const labelBg = elements.find(e => e.id === 'edge_ab_bg' && e.type === 'rectangle')
    expect(labelBg).toBeDefined()
    expect(labelBg?.backgroundColor).toBe('#ffffff')

    const labelText = elements.find(e => e.id === 'edge_ab_label' && e.type === 'text')
    expect(labelText).toBeDefined()
    expect(labelText?.text).toBe('3 imports')
  })

  it('uses default filename when not provided', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR)

    expect(result.filePath).toContain('system-overview.excalidraw')
    expect(result.success).toBe(true)
  })

  it('skips arrows with missing source or target zone', async () => {
    const diagram: LayoutedDiagram = {
      nodes: [{ id: 'node_x', x: 0, y: 0, width: 160, height: 40, label: 'X' }],
      edges: [{ id: 'edge_broken', sourceId: 'zone_missing_a', targetId: 'zone_missing_b' }],
      zones: [],
      width: 200,
      height: 200,
    }
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-broken')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string }[]

    const arrow = elements.find(e => e.id === 'edge_broken')
    expect(arrow).toBeUndefined()
    expect(result.success).toBe(true)
  })

  it('colors are assigned by zone index', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-colors')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; strokeColor?: string; backgroundColor?: string }[]

    const nodeA = elements.find(e => e.id === 'node_a' && e.type === 'rectangle')
    const nodeB = elements.find(e => e.id === 'node_b' && e.type === 'rectangle')
    expect(nodeA).toBeDefined()
    expect(nodeB).toBeDefined()
    expect(nodeA?.strokeColor).not.toBe(nodeB?.strokeColor)
  })
})
