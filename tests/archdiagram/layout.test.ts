import { describe, it, expect } from 'vitest'
import { computeLayout } from '../../scripts/archdiagram/phases/layout.js'
import type { ArchitectureGraph } from '../../scripts/archdiagram/types.js'

function makeGraph(groups: string[], relationships: Array<[string, string]> = []): ArchitectureGraph {
  return {
    groups: groups.map(name => ({
      name,
      description: `${name} group`,
      files: [`${name}.ts`],
      role: 'backend',
    })),
    relationships: relationships.map(([from, to]) => ({
      from,
      to,
      label: 'calls',
      style: 'sync',
    })),
    c4Level: 1,
  }
}

describe('computeLayout', () => {
  it('produces valid coordinates for simple graph', async () => {
    const graph = makeGraph(['Auth', 'Database', 'Logger'])
    const layout = await computeLayout(graph)

    expect(layout.nodes.length).toBe(3)
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(Number.isNaN(node.x)).toBe(false)
      expect(Number.isNaN(node.y)).toBe(false)
    }
  }, 10000)

  it('width formula applied correctly', async () => {
    const graph = makeGraph(['Authentication Service'])
    const layout = await computeLayout(graph)

    expect(layout.nodes[0].width).toBeGreaterThanOrEqual(160)

    const shortGraph = makeGraph(['DB'])
    const shortLayout = await computeLayout(shortGraph)
    expect(shortLayout.nodes[0].width).toBeGreaterThanOrEqual(120)
  }, 10000)

  it('returns zones for each role group', async () => {
    const graph = makeGraph(['Auth', 'Logger'])
    const layout = await computeLayout(graph)

    expect(layout.zones.length).toBeGreaterThan(0)
    for (const zone of layout.zones) {
      expect(zone.width).toBeGreaterThan(0)
      expect(zone.height).toBeGreaterThan(0)
    }
  }, 10000)

  it('nodes have correct labels from group names', async () => {
    const graph = makeGraph(['PaymentService', 'AuthService'])
    const layout = await computeLayout(graph)

    const labels = layout.nodes.map(n => n.label)
    expect(labels).toContain('PaymentService')
    expect(labels).toContain('AuthService')
  }, 10000)

  it('produces edges for relationships', async () => {
    const graph = makeGraph(['A', 'B', 'C'], [['A', 'B'], ['B', 'C']])
    const layout = await computeLayout(graph)

    expect(layout.edges.length).toBe(2)
  }, 10000)
})
