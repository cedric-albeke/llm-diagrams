import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import { App } from '../../scripts/archdiagram/tui/App.js'

describe('App', () => {
  it('renders welcome screen by default', () => {
    const { lastFrame } = render(<App />)
    expect(lastFrame()).toContain('llm-diagrams')
    expect(lastFrame()).toContain('Welcome')
  })

  it('renders quit hint on welcome screen', () => {
    const { lastFrame } = render(<App />)
    expect(lastFrame()).toContain('q')
  })

  it('renders Architecture Diagram Generator subtitle', () => {
    const { lastFrame } = render(<App />)
    expect(lastFrame()).toContain('Architecture Diagram Generator')
  })

  it('renders welcome screen start prompt', () => {
    const { lastFrame } = render(<App />)
    expect(lastFrame()).toContain('press Enter to start')
  })
})
