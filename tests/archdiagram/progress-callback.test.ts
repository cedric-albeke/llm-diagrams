import { describe, it, expect } from 'vitest'
import { runPipeline } from '../../scripts/archdiagram/index.js'
import { DEFAULT_CONFIG } from '../../scripts/archdiagram/config.js'
import { FIXTURE_SRC, FIXTURE_TSCONFIG } from '../archdiagram/helpers.js'
import type { PipelineProgressEvent } from '../../scripts/archdiagram/types.js'

const BASE_CONFIG = {
  ...DEFAULT_CONFIG,
  srcDir: FIXTURE_SRC,
  tsConfigPath: FIXTURE_TSCONFIG,
  outputDir: '/tmp/archdiagram-progress-test',
  exclude: ['node_modules', 'dist'],
  llm: { ...DEFAULT_CONFIG.llm, provider: 'none' as const },
}

describe('onProgress callback', () => {
  it('fires start and complete events for all 4 phases', async () => {
    const events: PipelineProgressEvent[] = []
    await runPipeline(BASE_CONFIG, {
      onProgress: (event) => events.push(event),
    })

    const startEvents = events.filter(e => e.status === 'start')
    const completeEvents = events.filter(e => e.status === 'complete')
    expect(startEvents.length).toBe(4)
    expect(completeEvents.length).toBe(4)
  }, 30000)

  it('complete events have duration', async () => {
    const events: PipelineProgressEvent[] = []
    await runPipeline(BASE_CONFIG, { onProgress: (e) => events.push(e) })
    const completeEvents = events.filter(e => e.status === 'complete')
    for (const e of completeEvents) {
      expect(typeof e.duration).toBe('number')
      expect(e.duration).toBeGreaterThanOrEqual(0)
    }
  }, 30000)

  it('omitting callback does not crash', async () => {
    await expect(runPipeline(BASE_CONFIG, {})).resolves.toBeDefined()
  }, 30000)

  it('fires events in correct phase order', async () => {
    const phases: string[] = []
    await runPipeline(BASE_CONFIG, {
      onProgress: (e) => { if (e.status === 'start') phases.push(e.phase) },
    })
    expect(phases).toEqual(['analyze', 'reason', 'layout', 'render'])
  }, 30000)
})
