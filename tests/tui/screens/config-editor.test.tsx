import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { ConfigEditor } from '../../../scripts/archdiagram/tui/screens/ConfigEditor.js'
import type { ScreenProps } from '../../../scripts/archdiagram/tui/types.js'
import { DEFAULT_CONFIG } from '../../../scripts/archdiagram/config.js'
import type { ArchDiagramConfig } from '../../../scripts/archdiagram/types.js'

function makeProps(overrides?: Partial<ScreenProps>): ScreenProps {
  return {
    state: {
      screen: 'config',
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw', 'mermaid'],
    },
    setState: vi.fn(),
    setScreen: vi.fn(),
    ...overrides,
  }
}

function makePropsWithProvider(provider: ArchDiagramConfig['llm']['provider']): ScreenProps {
  return makeProps({
    state: {
      screen: 'config',
      config: { ...DEFAULT_CONFIG, llm: { ...DEFAULT_CONFIG.llm, provider } },
      selectedFormats: ['excalidraw'],
    },
  })
}

describe('ConfigEditor', () => {
  it('renders the Configure Diagram title', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('Configure Diagram')
  })

  it('renders all 7 fields when provider is none (model hidden)', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Source Directory')
    expect(frame).toContain('tsconfig Path')
    expect(frame).toContain('Output Directory')
    expect(frame).toContain('Exclude Patterns')
    expect(frame).toContain('Temperature')
    expect(frame).toContain('Layout Direction')
    expect(frame).toContain('Font Size')
    expect(frame).not.toContain('LLM Model')
  })

  it('renders all 8 editable fields when provider requires model (anthropic)', () => {
    const { lastFrame } = render(<ConfigEditor {...makePropsWithProvider('anthropic')} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Source Directory')
    expect(frame).toContain('tsconfig Path')
    expect(frame).toContain('Output Directory')
    expect(frame).toContain('Exclude Patterns')
    expect(frame).toContain('LLM Model')
    expect(frame).toContain('Temperature')
    expect(frame).toContain('Layout Direction')
    expect(frame).toContain('Font Size')
  })

  it('hides LLM Model field when provider is claude-subscription', () => {
    const { lastFrame } = render(<ConfigEditor {...makePropsWithProvider('claude-subscription')} />)
    expect(lastFrame()).not.toContain('LLM Model')
  })

  it('shows current srcDir value', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('src')
  })

  it('shows current tsConfigPath value', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('tsconfig.json')
  })

  it('shows current outputDir value', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('docs/architecture')
  })

  it('shows current exclude patterns joined with comma', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('node_modules')
  })

  it('shows current temperature value', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('0.1')
  })

  it('shows current layout direction value', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('RIGHT')
  })

  it('shows current font size value', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('16')
  })

  it('shows provider name as read-only', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('Static (no LLM)')
  })

  it('shows Anthropic API as provider label when anthropic provider selected', () => {
    const { lastFrame } = render(<ConfigEditor {...makePropsWithProvider('anthropic')} />)
    expect(lastFrame()).toContain('Anthropic API')
  })

  it('shows provider change hint', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('change in provider screen')
  })

  it('shows Next navigation item', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('Next (Enter when done)')
  })

  it('shows navigation hint footer', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('navigate')
  })

  it('shows Esc back hint in footer', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    expect(lastFrame()).toContain('back')
  })

  it('calls setScreen("provider") on Escape', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<ConfigEditor {...makeProps({ setScreen })} />)
    stdin.write('\x1B')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('provider')
  })

  it('calls setScreen("formats") on Enter when Next item is focused', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<ConfigEditor {...makeProps({ setScreen })} />)
    for (let i = 0; i < 8; i++) {
      stdin.write('\x1B[B')
      await new Promise(r => setTimeout(r, 20))
    }
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('formats')
  })

  it('highlights first field with cursor by default', () => {
    const { lastFrame } = render(<ConfigEditor {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('❯')
  })

  it('navigates down with arrow key', async () => {
    const { lastFrame, stdin } = render(<ConfigEditor {...makeProps()} />)
    const frameBefore = lastFrame() ?? ''
    stdin.write('\x1B[B')
    await new Promise(r => setTimeout(r, 50))
    const frameAfter = lastFrame() ?? ''
    expect(frameAfter).toBeDefined()
    expect(frameBefore).not.toBe(frameAfter)
  })
})
