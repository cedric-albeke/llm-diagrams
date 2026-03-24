#!/usr/bin/env tsx
import React from 'react'
import { render } from 'ink'
import { App } from './App.js'

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
llm-diagrams TUI v0.1.0

Usage: npm run tui [options]

Options:
  --help, -h          Show this help message
  --no-interactive    Exit immediately (for CI/smoke testing)

Keyboard shortcuts:
  ↑ / ↓              Navigate options
  Enter               Select / confirm
  Space               Toggle checkbox
  Escape              Go back
  q                   Quit (from any screen except during pipeline execution)
`)
  process.exit(0)
}

if (args.includes('--no-interactive')) {
  console.log('llm-diagrams TUI v0.1.0 — non-interactive mode, exiting.')
  process.exit(0)
}

render(<App />)
