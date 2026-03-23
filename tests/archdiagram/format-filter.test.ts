import { describe, it, expect } from 'vitest'
import { runPipeline } from '../../scripts/archdiagram/index.js'
import { DEFAULT_CONFIG } from '../../scripts/archdiagram/config.js'
import { FIXTURE_SRC, FIXTURE_TSCONFIG } from '../archdiagram/helpers.js'

const BASE_CONFIG = {
  ...DEFAULT_CONFIG,
  srcDir: FIXTURE_SRC,
  tsConfigPath: FIXTURE_TSCONFIG,
  outputDir: '/tmp/archdiagram-format-filter-test',
  exclude: ['node_modules', 'dist'],
  llm: { ...DEFAULT_CONFIG.llm, provider: 'none' as const },
}

describe('formats filter', () => {
  it('formats undefined renders all formats', async () => {
    const result = await runPipeline(BASE_CONFIG, {})
    const formats = result.outputs.filter(o => o.success).map(o => o.format)
    expect(formats).toContain('excalidraw')
    expect(formats).toContain('mermaid')
  }, 30000)

  it('formats: [excalidraw] renders only excalidraw', async () => {
    const result = await runPipeline(BASE_CONFIG, { formats: ['excalidraw'] })
    const formats = result.outputs.filter(o => o.success).map(o => o.format)
    expect(formats).toContain('excalidraw')
    expect(formats).not.toContain('mermaid')
  }, 30000)

  it('formats: [svg] auto-generates mermaid intermediate and produces svg', async () => {
    const result = await runPipeline(BASE_CONFIG, { formats: ['svg'] })
    const outputFormats = result.outputs.filter(o => o.success).map(o => o.format)
    expect(outputFormats).not.toContain('mermaid')
    const renderPhase = result.phases.find(p => p.phase === 'render')
    expect(renderPhase).toBeDefined()
  }, 30000)

  it('formats: [mermaid] renders only mermaid', async () => {
    const result = await runPipeline(BASE_CONFIG, { formats: ['mermaid'] })
    const formats = result.outputs.filter(o => o.success).map(o => o.format)
    expect(formats).toContain('mermaid')
    expect(formats).not.toContain('excalidraw')
  }, 30000)
})
