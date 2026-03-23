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

  it('arrow bindings reference valid node IDs', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-arrows')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as {
      id: string
      type: string
      startBinding?: { elementId: string }
      endBinding?: { elementId: string }
    }[]

    const arrow = elements.find(e => e.id === 'edge_ab' && e.type === 'arrow')
    expect(arrow).toBeDefined()
    expect(arrow?.startBinding?.elementId).toBe('node_a')
    expect(arrow?.endBinding?.elementId).toBe('node_b')

    const allIds = new Set(elements.map(e => e.id))
    expect(allIds.has(arrow?.startBinding?.elementId ?? '')).toBe(true)
    expect(allIds.has(arrow?.endBinding?.elementId ?? '')).toBe(true)
  })

  it('zone rectangles are present with low opacity', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-zones')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; opacity?: number }[]

    const zoneRect = elements.find(e => e.id === 'zone_z1' && e.type === 'rectangle')
    expect(zoneRect).toBeDefined()
    expect(zoneRect?.opacity).toBe(10)

    const zoneLabel = elements.find(e => e.id === 'zone_z1_label' && e.type === 'text')
    expect(zoneLabel).toBeDefined()
  })

  it('uses default filename when not provided', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR)

    expect(result.filePath).toContain('system-overview.excalidraw')
    expect(result.success).toBe(true)
  })

  it('skips arrows with missing source or target node', async () => {
    const diagram: LayoutedDiagram = {
      nodes: [{ id: 'node_x', x: 0, y: 0, width: 160, height: 60, label: 'X' }],
      edges: [{ id: 'edge_broken', sourceId: 'node_x', targetId: 'node_missing' }],
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

  it('node colors reflect role — backend gets purple stroke', async () => {
    const diagram = makeSimpleDiagram()
    const result = await renderExcalidraw(diagram, OUTPUT_DIR, 'test-colors')
    const parsed = JSON.parse(fs.readFileSync(result.filePath, 'utf-8'))
    const elements = parsed.elements as { id: string; type: string; strokeColor?: string; backgroundColor?: string }[]

    const backendRect = elements.find(e => e.id === 'node_a' && e.type === 'rectangle')
    expect(backendRect?.strokeColor).toBe('#862e9c')
    expect(backendRect?.backgroundColor).toBe('#eebefa')

    const frontendRect = elements.find(e => e.id === 'node_b' && e.type === 'rectangle')
    expect(frontendRect?.strokeColor).toBe('#1971c2')
    expect(frontendRect?.backgroundColor).toBe('#a5d8ff')
  })
})
