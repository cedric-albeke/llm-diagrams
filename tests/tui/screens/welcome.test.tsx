import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { Welcome } from '../../../scripts/archdiagram/tui/screens/Welcome.js'
import type { ScreenProps } from '../../../scripts/archdiagram/tui/types.js'
import { DEFAULT_CONFIG } from '../../../scripts/archdiagram/config.js'

function makeProps(overrides?: Partial<ScreenProps>): ScreenProps {
  return {
    state: {
      screen: 'welcome',
      config: DEFAULT_CONFIG,
      selectedFormats: ['excalidraw', 'mermaid'],
    },
    setState: vi.fn(),
    setScreen: vi.fn(),
    ...overrides,
  }
}

describe('Welcome', () => {
  it('renders app name in bold cyan', () => {
    const { lastFrame } = render(<Welcome {...makeProps()} />)
    expect(lastFrame()).toContain('llm-diagrams')
  })

  it('renders version number', () => {
    const { lastFrame } = render(<Welcome {...makeProps()} />)
    expect(lastFrame()).toContain('v0.1.0')
  })

  it('renders Architecture Diagram Generator tagline', () => {
    const { lastFrame } = render(<Welcome {...makeProps()} />)
    expect(lastFrame()).toContain('Architecture Diagram Generator')
  })

  it('renders Enter shortcut hint', () => {
    const { lastFrame } = render(<Welcome {...makeProps()} />)
    expect(lastFrame()).toContain('Enter')
  })

  it('renders quit shortcut hint', () => {
    const { lastFrame } = render(<Welcome {...makeProps()} />)
    expect(lastFrame()).toContain('q')
  })

  it('renders press Enter to start prompt', () => {
    const { lastFrame } = render(<Welcome {...makeProps()} />)
    expect(lastFrame()).toContain('press Enter to start')
  })

  it('calls setScreen("provider") when Enter is pressed', async () => {
    const setScreen = vi.fn()
    const { stdin } = render(<Welcome {...makeProps({ setScreen })} />)
    stdin.write('\r')
    await new Promise(r => setTimeout(r, 50))
    expect(setScreen).toHaveBeenCalledWith('provider')
  })

  it('calls exit when q is pressed', async () => {
    const { stdin, lastFrame } = render(<Welcome {...makeProps()} />)
    stdin.write('q')
    await new Promise(r => setTimeout(r, 50))
    expect(lastFrame()).toBeDefined()
  })
})
