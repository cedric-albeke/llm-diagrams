import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import type { ScreenProps } from '../../../scripts/archdiagram/tui/types.js'
import type { PipelineResult } from '../../../scripts/archdiagram/types.js'
import { DEFAULT_CONFIG } from '../../../scripts/archdiagram/config.js'

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => '```mermaid\ngraph TD\n  A --> B\n  B --> C\n```\n'),
    writeFileSync: vi.fn(),
  },
}))

vi.mock('../../../scripts/archdiagram/config-serializer.js', () => ({
  saveConfig: vi.fn(),
}))

const mockResult: PipelineResult = {
  phases: [
    { phase: 'analyze', success: true, duration: 850 },
    { phase: 'reason', success: true, duration: 1 },
    { phase: 'layout', success: true, duration: 90 },
    { phase: 'render', success: true, duration: 3000 },
  ],
  outputs: [
    { format: 'excalidraw', filePath: 'docs/architecture/system-overview.excalidraw', success: true },
    { format: 'mermaid', filePath: 'docs/architecture/system-overview.md', success: true },
  ],
  duration: 4000,
}

const mockResultWithError: PipelineResult = {
  phases: [
    { phase: 'analyze', success: true, duration: 850 },
    { phase: 'reason', success: false, duration: 0, error: 'LLM failed' },
    { phase: 'layout', success: false, duration: 0 },
    { phase: 'render', success: false, duration: 0 },
  ],
  outputs: [],
  duration: 850,
}

function makeProps(overrides?: Partial<ScreenProps>): ScreenProps {
  return {
    state: {
      screen: 'results',
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw', 'mermaid'],
      pipelineResult: mockResult,
    },
    setState: vi.fn(),
    setScreen: vi.fn(),
    ...overrides,
  }
}

describe('Results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Generation Complete" when all phases succeed', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    expect(lastFrame()).toContain('Generation Complete')
  })

  it('shows "Generation Failed" when a phase fails', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(
      <Results
        {...makeProps({
          state: {
            screen: 'results',
            config: DEFAULT_CONFIG,
            selectedFormats: ['excalidraw'],
            pipelineResult: mockResultWithError,
          },
        })}
      />
    )
    expect(lastFrame()).toContain('Generation Failed')
  })

  it('renders all four phase names', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('analyze')
    expect(frame).toContain('reason')
    expect(frame).toContain('layout')
    expect(frame).toContain('render')
  })

  it('shows phase durations', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('850')
    expect(frame).toContain('3000')
  })

  it('shows Phase Summary header', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    expect(lastFrame()).toContain('Phase Summary')
  })

  it('shows output file paths for successful outputs', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('system-overview.excalidraw')
    expect(frame).toContain('system-overview.md')
  })

  it('shows output format labels', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('excalidraw')
    expect(frame).toContain('mermaid')
  })

  it('shows Output Files header', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    expect(lastFrame()).toContain('Output Files')
  })

  it('shows Mermaid Diagram Preview header', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    expect(lastFrame()).toContain('Mermaid Diagram Preview')
  })

  it('shows mermaid file content in preview', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    expect(lastFrame()).toContain('graph TD')
  })

  it('shows save config prompt text', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    expect(lastFrame()).toContain('archdiagram.config.ts')
  })

  it('shows Press q to exit prompt', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(<Results {...makeProps()} />)
    expect(lastFrame()).toContain('Press q to exit')
  })

  it('calls saveConfig with correct args when y is pressed', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const configModule = await import('../../../scripts/archdiagram/config-serializer.js')
    const { stdin } = render(<Results {...makeProps()} />)
    stdin.write('y')
    await new Promise(r => setTimeout(r, 50))
    expect(configModule.saveConfig).toHaveBeenCalledWith(DEFAULT_CONFIG, 'archdiagram.config.ts')
  })

  it('shows "Saved" confirmation after pressing y', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame, stdin } = render(<Results {...makeProps()} />)
    stdin.write('y')
    await new Promise(r => setTimeout(r, 50))
    expect(lastFrame()).toContain('Saved')
  })

  it('does not call saveConfig a second time if y pressed twice', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const configModule = await import('../../../scripts/archdiagram/config-serializer.js')
    const { stdin } = render(<Results {...makeProps()} />)
    stdin.write('y')
    await new Promise(r => setTimeout(r, 50))
    stdin.write('y')
    await new Promise(r => setTimeout(r, 50))
    expect(configModule.saveConfig).toHaveBeenCalledTimes(1)
  })

  it('does not show mermaid preview when no mermaid output exists', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const resultWithoutMermaid: PipelineResult = {
      phases: mockResult.phases,
      outputs: [{ format: 'excalidraw', filePath: 'foo.excalidraw', success: true }],
      duration: 4000,
    }
    const { lastFrame } = render(
      <Results
        {...makeProps({
          state: {
            screen: 'results',
            config: DEFAULT_CONFIG,
            selectedFormats: ['excalidraw'],
            pipelineResult: resultWithoutMermaid,
          },
        })}
      />
    )
    expect(lastFrame()).not.toContain('Mermaid Diagram Preview')
  })

  it('does not show Output Files when all outputs failed', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(
      <Results
        {...makeProps({
          state: {
            screen: 'results',
            config: DEFAULT_CONFIG,
            selectedFormats: [],
            pipelineResult: mockResultWithError,
          },
        })}
      />
    )
    expect(lastFrame()).not.toContain('Output Files')
  })

  it('handles missing pipelineResult gracefully', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(
      <Results
        {...makeProps({
          state: { screen: 'results', config: DEFAULT_CONFIG, selectedFormats: [] },
        })}
      />
    )
    const frame = lastFrame() ?? ''
    expect(frame).toBeTruthy()
    expect(frame).toContain('Press q to exit')
  })

  it('shows Generation Complete when pipelineResult is missing', async () => {
    const { Results } = await import('../../../scripts/archdiagram/tui/screens/Results.js')
    const { lastFrame } = render(
      <Results
        {...makeProps({
          state: { screen: 'results', config: DEFAULT_CONFIG, selectedFormats: [] },
        })}
      />
    )
    expect(lastFrame()).toContain('Generation Complete')
  })
})
