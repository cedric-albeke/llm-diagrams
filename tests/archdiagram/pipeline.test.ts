import { describe, it, expect } from 'vitest'
import { runPipeline } from '../../scripts/archdiagram/index.js'
import { DEFAULT_CONFIG } from '../../scripts/archdiagram/config.js'
import { FIXTURE_SRC, FIXTURE_TSCONFIG } from '../archdiagram/helpers.js'
import fs from 'fs'

const TEST_OUTPUT = '/tmp/archdiagram-pipeline-test'
const STATIC_CONFIG = {
  ...DEFAULT_CONFIG,
  srcDir: FIXTURE_SRC,
  tsConfigPath: FIXTURE_TSCONFIG,
  outputDir: TEST_OUTPUT,
  exclude: ['node_modules', 'dist'],
  llm: { ...DEFAULT_CONFIG.llm, provider: 'none' as const },
}

describe('runPipeline - static mode', () => {
  it('completes all phases successfully', async () => {
    const result = await runPipeline(STATIC_CONFIG)
    expect(result.phases.length).toBeGreaterThan(0)
    expect(result.duration).toBeGreaterThan(0)
  }, 60000)

  it('produces .excalidraw output file', async () => {
    const result = await runPipeline(STATIC_CONFIG)
    const excalidrawResult = result.outputs.find(o => o.format === 'excalidraw' && o.success)
    expect(excalidrawResult).toBeDefined()
    expect(fs.existsSync(excalidrawResult!.filePath)).toBe(true)
  }, 60000)

  it('produces mermaid .md output file', async () => {
    const result = await runPipeline(STATIC_CONFIG)
    const mermaidResult = result.outputs.find(o => o.format === 'mermaid' && o.success)
    expect(mermaidResult).toBeDefined()
    expect(fs.existsSync(mermaidResult!.filePath)).toBe(true)
  }, 60000)

  it('dry-run creates no output files', async () => {
    const dryDir = '/tmp/archdiagram-dry-test'
    if (fs.existsSync(dryDir)) fs.rmSync(dryDir, { recursive: true })

    await runPipeline({ ...STATIC_CONFIG, outputDir: dryDir }, { dryRun: true })

    const exists = fs.existsSync(dryDir)
    expect(!exists || fs.readdirSync(dryDir).length === 0).toBe(true)
  }, 60000)

  it('analyze phase succeeds', async () => {
    const result = await runPipeline(STATIC_CONFIG)
    const analyzePhase = result.phases.find(p => p.phase === 'analyze')
    expect(analyzePhase).toBeDefined()
    expect(analyzePhase?.success).toBe(true)
  }, 60000)

  it('validate-only returns only analyze phase', async () => {
    const result = await runPipeline(STATIC_CONFIG, { validateOnly: true })
    expect(result.phases.length).toBe(1)
    expect(result.phases[0].phase).toBe('analyze')
    expect(result.outputs.length).toBe(0)
  }, 60000)

  it('returns duration in ms', async () => {
    const result = await runPipeline(STATIC_CONFIG)
    expect(typeof result.duration).toBe('number')
    expect(result.duration).toBeGreaterThan(0)
  }, 60000)

  it('all phase results have required fields', async () => {
    const result = await runPipeline(STATIC_CONFIG)
    for (const phase of result.phases) {
      expect(typeof phase.phase).toBe('string')
      expect(typeof phase.success).toBe('boolean')
      expect(typeof phase.duration).toBe('number')
    }
  }, 60000)
})
