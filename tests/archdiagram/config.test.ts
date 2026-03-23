import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG, parseCliFlags, mergeConfig, validateConfig } from '../../scripts/archdiagram/config.js'

describe('DEFAULT_CONFIG', () => {
  it('has all required fields', () => {
    expect(DEFAULT_CONFIG.srcDir).toBe('src')
    expect(DEFAULT_CONFIG.tsConfigPath).toBe('tsconfig.json')
    expect(DEFAULT_CONFIG.outputDir).toBe('docs/architecture')
    expect(DEFAULT_CONFIG.llm.provider).toBe('none')
    expect(DEFAULT_CONFIG.style.direction).toBe('RIGHT')
  })
})

describe('parseCliFlags', () => {
  it('parses --src-dir', () => {
    const flags = parseCliFlags(['--src-dir', 'lib'])
    expect(flags.srcDir).toBe('lib')
  })
  it('parses --mode static sets llm.provider to none', () => {
    const flags = parseCliFlags(['--mode', 'static'])
    expect(flags.llm?.provider).toBe('none')
  })
  it('parses --output-dir', () => {
    const flags = parseCliFlags(['--output-dir', 'out'])
    expect(flags.outputDir).toBe('out')
  })
  it('returns empty object for unknown flags', () => {
    const flags = parseCliFlags(['--unknown-flag', 'value'])
    expect(Object.keys(flags).length).toBe(0)
  })
})

describe('mergeConfig', () => {
  it('CLI overrides file config', () => {
    const merged = mergeConfig(DEFAULT_CONFIG, { srcDir: 'override' })
    expect(merged.srcDir).toBe('override')
  })
  it('preserves defaults for missing CLI flags', () => {
    const merged = mergeConfig(DEFAULT_CONFIG, {})
    expect(merged.srcDir).toBe(DEFAULT_CONFIG.srcDir)
  })
})

describe('validateConfig', () => {
  it('rejects non-existent srcDir', () => {
    const result = validateConfig({ ...DEFAULT_CONFIG, srcDir: '/nonexistent/path/that/does/not/exist' })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
