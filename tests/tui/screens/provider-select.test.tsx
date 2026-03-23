import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { ProviderSelect } from '../../../scripts/archdiagram/tui/screens/ProviderSelect.js'
import type { ScreenProps } from '../../../scripts/archdiagram/tui/types.js'
import { DEFAULT_CONFIG } from '../../../scripts/archdiagram/config.js'

function makeProps(overrides?: Partial<ScreenProps>): ScreenProps {
  return {
    state: {
      screen: 'provider',
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw', 'mermaid'],
    },
    setState: vi.fn(),
    setScreen: vi.fn(),
    ...overrides,
  }
}

describe('ProviderSelect', () => {
  it('renders title', () => {
    const { lastFrame } = render(<ProviderSelect {...makeProps()} />)
    expect(lastFrame()).toContain('Select LLM Provider')
  })

  it('renders all 6 provider options', () => {
    const { lastFrame } = render(<ProviderSelect {...makeProps()} />)
    expect(lastFrame()).toContain('Static (no LLM)')
    expect(lastFrame()).toContain('Anthropic API')
    expect(lastFrame()).toContain('Claude Subscription')
    expect(lastFrame()).toContain('OpenAI')
    expect(lastFrame()).toContain('OpenRouter')
    expect(lastFrame()).toContain('llmapi.ai')
  })

  it('shows back navigation hint', () => {
    const { lastFrame } = render(<ProviderSelect {...makeProps()} />)
    expect(lastFrame()).toContain('Back (Escape)')
  })

  it('shows description for focused option', () => {
    const { lastFrame } = render(<ProviderSelect {...makeProps()} />)
    expect(lastFrame()).toContain('Fast, no API key needed')
  })

  it('highlights first option by default', () => {
    const { lastFrame } = render(<ProviderSelect {...makeProps()} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('❯')
    expect(frame.indexOf('❯')).toBeLessThan(frame.indexOf('Static (no LLM)') + 5)
  })

  it('navigates down with arrow key', async () => {
    const { lastFrame, stdin } = render(<ProviderSelect {...makeProps()} />)
    stdin.write('\x1B[B')
    await new Promise(r => setTimeout(r, 50))
    expect(lastFrame()).toContain('Anthropic API')
    expect(lastFrame()).toContain('Requires ANTHROPIC_API_KEY')
  })

  it('calls setScreen("config") on Enter', async () => {
    const setScreen = vi.fn()
    const setState = vi.fn()
    const { stdin } = render(<ProviderSelect {...makeProps({ setScreen, setState })} />)
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('config')
  })

  it('sets provider to "none" when Enter on first option', async () => {
    const setState = vi.fn()
    const setScreen = vi.fn()
    const { stdin } = render(<ProviderSelect {...makeProps({ setState, setScreen })} />)
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setState).toHaveBeenCalled()
    const updater = setState.mock.calls[0][0]
    const prevState = {
      screen: 'provider' as const,
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw' as const, 'mermaid' as const],
    }
    const nextState = updater(prevState)
    expect(nextState.config.llm.provider).toBe('none')
  })

  it('calls setScreen("welcome") on Escape', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<ProviderSelect {...makeProps({ setScreen })} />)
    stdin.write('\x1B')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('welcome')
  })
})
