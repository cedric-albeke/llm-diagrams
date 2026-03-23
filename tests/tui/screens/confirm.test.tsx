import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { Confirm } from '../../../scripts/archdiagram/tui/screens/Confirm.js'
import type { ScreenProps } from '../../../scripts/archdiagram/tui/types.js'
import { DEFAULT_CONFIG } from '../../../scripts/archdiagram/config.js'
import type { OutputFormat } from '../../../scripts/archdiagram/types.js'

function makeProps(overrides?: Partial<ScreenProps>): ScreenProps {
  return {
    state: {
      screen: 'confirm',
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
      screen: 'confirm',
      config: DEFAULT_CONFIG,
      selectedFormats,
    },
  })
}

describe('Confirm', () => {
  it('renders the title', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('Ready to Generate')
  })

  it('shows source directory from config', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('src')
    expect(lastFrame()).toContain('Source Dir')
  })

  it('shows output directory from config', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('docs/architecture')
    expect(lastFrame()).toContain('Output Dir')
  })

  it('shows LLM provider label', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('LLM Provider')
    expect(lastFrame()).toContain('Static (no LLM)')
  })

  it('shows selected formats', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('Selected Formats')
    expect(lastFrame()).toContain('excalidraw')
    expect(lastFrame()).toContain('mermaid')
  })

  it('shows dry run row', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('Dry Run')
  })

  it('shows Enter to run instruction', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('Press Enter to run')
  })

  it('shows Escape back hint', () => {
    const { lastFrame } = render(<Confirm {...makeProps()} />)
    expect(lastFrame()).toContain('Press Escape to go back')
  })

  it('calls setScreen("dashboard") on Enter', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<Confirm {...makeProps({ setScreen })} />)
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('dashboard')
  })

  it('calls setScreen("config") on Escape', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<Confirm {...makeProps({ setScreen })} />)
    stdin.write('\x1B')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('config')
  })

  it('shows correct provider label for anthropic', () => {
    const { lastFrame } = render(
      <Confirm
        {...makeProps({
          state: {
            screen: 'confirm',
            config: { ...DEFAULT_CONFIG, llm: { ...DEFAULT_CONFIG.llm, provider: 'anthropic' } },
            selectedFormats: ['excalidraw'],
          },
        })}
      />
    )
    expect(lastFrame()).toContain('Anthropic API')
  })

  it('shows correct provider label for openai', () => {
    const { lastFrame } = render(
      <Confirm
        {...makeProps({
          state: {
            screen: 'confirm',
            config: { ...DEFAULT_CONFIG, llm: { ...DEFAULT_CONFIG.llm, provider: 'openai' } },
            selectedFormats: ['mermaid'],
          },
        })}
      />
    )
    expect(lastFrame()).toContain('OpenAI')
  })

  it('shows all selected formats joined by comma', () => {
    const { lastFrame } = render(
      <Confirm {...makePropsWithFormats(['excalidraw', 'mermaid', 'svg'])} />
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('excalidraw')
    expect(frame).toContain('mermaid')
    expect(frame).toContain('svg')
  })

  it('shows custom srcDir from config', () => {
    const { lastFrame } = render(
      <Confirm
        {...makeProps({
          state: {
            screen: 'confirm',
            config: { ...DEFAULT_CONFIG, srcDir: 'my-custom-src' },
            selectedFormats: ['excalidraw'],
          },
        })}
      />
    )
    expect(lastFrame()).toContain('my-custom-src')
  })

  it('shows custom outputDir from config', () => {
    const { lastFrame } = render(
      <Confirm
        {...makeProps({
          state: {
            screen: 'confirm',
            config: { ...DEFAULT_CONFIG, outputDir: 'my-output' },
            selectedFormats: ['excalidraw'],
          },
        })}
      />
    )
    expect(lastFrame()).toContain('my-output')
  })
})
