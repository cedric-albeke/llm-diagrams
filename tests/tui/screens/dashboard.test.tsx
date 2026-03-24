import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import type { ScreenProps } from '../../../scripts/archdiagram/tui/types.js'
import type { PipelineProgressEvent } from '../../../scripts/archdiagram/types.js'
import { DEFAULT_CONFIG } from '../../../scripts/archdiagram/config.js'

vi.mock('../../../scripts/archdiagram/index.js', () => ({
  runPipeline: vi.fn().mockResolvedValue({
    phases: [
      { phase: 'analyze', success: true, duration: 100 },
      { phase: 'reason', success: true, duration: 200 },
      { phase: 'layout', success: true, duration: 50 },
      { phase: 'render', success: true, duration: 80 },
    ],
    outputs: [],
    duration: 430,
  }),
}))

function makeProps(overrides?: Partial<ScreenProps>): ScreenProps {
  return {
    state: {
      screen: 'dashboard',
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw', 'mermaid'],
    },
    setState: vi.fn(),
    setScreen: vi.fn(),
    ...overrides,
  }
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all four phase names', async () => {
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const { lastFrame } = render(<Dashboard {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('analyze')
    expect(frame).toContain('reason')
    expect(frame).toContain('layout')
    expect(frame).toContain('render')
  })

  it('renders the running pipeline header initially', async () => {
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const { lastFrame } = render(<Dashboard {...makeProps()} />)
    expect(lastFrame()).toContain('Running pipeline')
  })

  it('shows waiting status for phases initially', async () => {
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const { lastFrame } = render(<Dashboard {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('waiting')
  })

  it('calls runPipeline with config and selectedFormats', async () => {
    const { runPipeline } = await import('../../../scripts/archdiagram/index.js')
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const props = makeProps()
    render(<Dashboard {...props} />)
    await new Promise(r => setTimeout(r, 50))
    expect(runPipeline).toHaveBeenCalledWith(
      DEFAULT_CONFIG,
      expect.objectContaining({
        formats: ['excalidraw', 'mermaid'],
        onProgress: expect.any(Function),
      })
    )
  })

  it('calls setState with pipelineResult after pipeline completes', async () => {
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const setState = vi.fn()
    render(<Dashboard {...makeProps({ setState })} />)
    await new Promise(r => setTimeout(r, 100))
    expect(setState).toHaveBeenCalled()
    const updater = setState.mock.calls[0][0]
    const prevState = {
      screen: 'dashboard' as const,
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw', 'mermaid'] as const,
    }
    const nextState = updater(prevState)
    expect(nextState.pipelineResult).toBeDefined()
    expect(nextState.pipelineResult.phases).toHaveLength(4)
  })

  it('calls setScreen("results") after 1 second delay', async () => {
    vi.useFakeTimers()
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const setScreen = vi.fn()
    render(<Dashboard {...makeProps({ setScreen })} />)
    await vi.runAllTimersAsync()
    expect(setScreen).toHaveBeenCalledWith('results')
    vi.useRealTimers()
  })

  it('shows "Press any key to continue" when done', async () => {
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const { lastFrame } = render(<Dashboard {...makeProps()} />)
    await new Promise(r => setTimeout(r, 100))
    expect(lastFrame()).toContain('Press any key to continue')
  })

  it('handles pipeline error gracefully', async () => {
    const { runPipeline } = await import('../../../scripts/archdiagram/index.js')
    const mockRunPipeline = vi.mocked(runPipeline)
    mockRunPipeline.mockRejectedValueOnce(new Error('pipeline failed'))

    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const { lastFrame } = render(<Dashboard {...makeProps()} />)
    await new Promise(r => setTimeout(r, 100))
    const frame = lastFrame() ?? ''
    expect(frame).toBeTruthy()
  })

  it('stores errorMessage in state when pipeline fails', async () => {
    const { runPipeline } = await import('../../../scripts/archdiagram/index.js')
    const mockRunPipeline = vi.mocked(runPipeline)
    mockRunPipeline.mockRejectedValueOnce(new Error('something broke'))

    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const setState = vi.fn()
    render(<Dashboard {...makeProps({ setState })} />)
    await new Promise(r => setTimeout(r, 100))
    expect(setState).toHaveBeenCalled()
    const setterCalls = setState.mock.calls.map((call: unknown[]) => {
      const updater = call[0] as (s: unknown) => unknown
      return updater({ screen: 'dashboard', config: DEFAULT_CONFIG, selectedFormats: [] })
    })
    const errorCall = setterCalls.find((result: unknown) => (result as Record<string, unknown>).errorMessage !== undefined)
    expect(errorCall).toBeDefined()
  })

  it('navigates to results on any key press after done', async () => {
    vi.useFakeTimers()
    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const setScreen = vi.fn()
    const { stdin } = render(<Dashboard {...makeProps({ setScreen })} />)
    await vi.runAllTimersAsync()
    stdin.write('a')
    await vi.runAllTimersAsync()
    expect(setScreen).toHaveBeenCalledWith('results')
    vi.useRealTimers()
  })

  it('shows "Failed" header when pipeline errors', async () => {
    const { runPipeline } = await import('../../../scripts/archdiagram/index.js')
    const mockRunPipeline = vi.mocked(runPipeline)
    mockRunPipeline.mockRejectedValueOnce(new Error('fatal error'))

    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const { lastFrame } = render(<Dashboard {...makeProps()} />)
    await new Promise(r => setTimeout(r, 100))
    expect(lastFrame()).toContain('Failed')
  })

  it('calls setScreen("results") after 1 second on pipeline failure', async () => {
    vi.useFakeTimers()
    const { runPipeline } = await import('../../../scripts/archdiagram/index.js')
    const mockRunPipeline = vi.mocked(runPipeline)
    mockRunPipeline.mockRejectedValueOnce(new Error('fatal'))

    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    const setScreen = vi.fn()
    render(<Dashboard {...makeProps({ setScreen })} />)
    await vi.runAllTimersAsync()
    expect(setScreen).toHaveBeenCalledWith('results')
    vi.useRealTimers()
  })

  it('updates phase status when onProgress is called with start event', async () => {
    const { runPipeline } = await import('../../../scripts/archdiagram/index.js')
    const mockRunPipeline = vi.mocked(runPipeline)

    let capturedOnProgress: ((event: PipelineProgressEvent) => void) | undefined

    mockRunPipeline.mockImplementationOnce(async (_config, options) => {
      capturedOnProgress = options?.onProgress
      capturedOnProgress?.({ phase: 'analyze', status: 'start' })
      await new Promise(r => setTimeout(r, 10))
      capturedOnProgress?.({ phase: 'analyze', status: 'complete', duration: 100 })
      return {
        phases: [{ phase: 'analyze', success: true, duration: 100 }],
        outputs: [],
        duration: 100,
      }
    })

    const { Dashboard } = await import('../../../scripts/archdiagram/tui/screens/Dashboard.js')
    render(<Dashboard {...makeProps()} />)
    await new Promise(r => setTimeout(r, 100))
    expect(capturedOnProgress).toBeDefined()
  })
})
