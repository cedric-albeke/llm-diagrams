import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { FormatFilter } from '../../../scripts/archdiagram/tui/screens/FormatFilter.js'
import type { ScreenProps } from '../../../scripts/archdiagram/tui/types.js'
import { DEFAULT_CONFIG } from '../../../scripts/archdiagram/config.js'
import type { OutputFormat } from '../../../scripts/archdiagram/types.js'

function makeProps(overrides?: Partial<ScreenProps>): ScreenProps {
  return {
    state: {
      screen: 'formats',
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw', 'mermaid'],
    },
    setState: vi.fn(),
    setScreen: vi.fn(),
    ...overrides,
  }
}

function makePropsWithFormats(selectedFormats: OutputFormat[]): ScreenProps {
  return makeProps({
    state: {
      screen: 'formats',
      config: DEFAULT_CONFIG,
      selectedFormats,
    },
  })
}

describe('FormatFilter', () => {
  it('renders the title', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    expect(lastFrame()).toContain('Select Output Formats')
  })

  it('renders all 5 format options', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('excalidraw')
    expect(frame).toContain('mermaid')
    expect(frame).toContain('svg')
    expect(frame).toContain('png')
    expect(frame).toContain('canvas')
  })

  it('shows excalidraw and mermaid checked by default', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    const excalidrawLine = lines.find(l => l.includes('excalidraw'))
    const mermaidLine = lines.find(l => l.includes('mermaid'))
    expect(excalidrawLine).toContain('✓')
    expect(mermaidLine).toContain('✓')
  })

  it('shows svg, png, canvas unchecked by default', () => {
    const { lastFrame } = render(<FormatFilter {...makePropsWithFormats(['excalidraw', 'mermaid'])} />)
    const frame = lastFrame() ?? ''
    const checkmarks = (frame.match(/✓/g) ?? []).length
    expect(checkmarks).toBe(2)
  })

  it('shows canvas hint about port 3444', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    expect(lastFrame()).toContain('port 3444')
  })

  it('shows svg hint about requiring mermaid', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    expect(lastFrame()).toContain('requires mermaid')
  })

  it('shows Next navigation item', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    expect(lastFrame()).toContain('→ Next')
  })

  it('shows navigation hint footer', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    expect(lastFrame()).toContain('navigate')
  })

  it('shows back hint in footer', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    expect(lastFrame()).toContain('back')
  })

  it('highlights first option with cursor by default', () => {
    const { lastFrame } = render(<FormatFilter {...makeProps()} />)
    expect(lastFrame()).toContain('❯')
  })

  it('calls setScreen("config") on Escape', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<FormatFilter {...makeProps({ setScreen })} />)
    stdin.write('\x1B')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('config')
  })

  it('calls setScreen("confirm") on Enter when Next is focused with formats selected', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<FormatFilter {...makeProps({ setScreen })} />)
    for (let i = 0; i < 5; i++) {
      stdin.write('\x1B[B')
      await new Promise(r => setTimeout(r, 20))
    }
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('confirm')
  })

  it('shows error when trying to proceed with no formats selected', async () => {
    const setScreen = vi.fn()
    const { lastFrame, stdin } = render(
      <FormatFilter {...makePropsWithFormats([])} setScreen={setScreen} setState={vi.fn()} />
    )
    for (let i = 0; i < 5; i++) {
      stdin.write('\x1B[B')
      await new Promise(r => setTimeout(r, 20))
    }
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).not.toHaveBeenCalledWith('confirm')
    expect(lastFrame()).toContain('Select at least one format')
  })

  it('calls setState to toggle format on Space', async () => {
    const setState = vi.fn()
    const { stdin } = render(<FormatFilter {...makeProps({ setState })} />)
    stdin.write(' ')
    await new Promise(r => setTimeout(r, 50))
    expect(setState).toHaveBeenCalled()
  })

  it('calls setState to toggle format on Enter when on a format row', async () => {
    const setState = vi.fn()
    const { stdin } = render(<FormatFilter {...makeProps({ setState })} />)
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setState).toHaveBeenCalled()
  })

  it('navigates down with arrow key', async () => {
    const { lastFrame, stdin } = render(<FormatFilter {...makeProps()} />)
    const frameBefore = lastFrame() ?? ''
    stdin.write('\x1B[B')
    await new Promise(r => setTimeout(r, 50))
    const frameAfter = lastFrame() ?? ''
    expect(frameBefore).not.toBe(frameAfter)
  })

  it('does not proceed to confirm when no formats after toggle', async () => {
    const setScreen = vi.fn()
    const setState = vi.fn()
    const { stdin } = render(
      <FormatFilter {...makePropsWithFormats([])} setScreen={setScreen} setState={setState} />
    )
    for (let i = 0; i < 5; i++) {
      stdin.write('\x1B[B')
      await new Promise(r => setTimeout(r, 20))
    }
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).not.toHaveBeenCalledWith('confirm')
  })
})
