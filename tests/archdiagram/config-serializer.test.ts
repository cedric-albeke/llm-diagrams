import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { serializeConfig, saveConfig } from '../../scripts/archdiagram/config-serializer.js'
import { loadConfigFile, DEFAULT_CONFIG } from '../../scripts/archdiagram/config.js'
import type { ArchDiagramConfig } from '../../scripts/archdiagram/types.js'

describe('serializeConfig', () => {
  it('output does not contain apiKey', () => {
    const config: ArchDiagramConfig = {
      ...DEFAULT_CONFIG,
      llm: { ...DEFAULT_CONFIG.llm, apiKey: 'sk-secret' },
    }
    const output = serializeConfig(config)
    expect(output).not.toContain('apiKey')
    expect(output).not.toContain('sk-secret')
  })

  it('output is valid TypeScript with import + export default', () => {
    const output = serializeConfig(DEFAULT_CONFIG)
    expect(output).toContain('import type')
    expect(output).toContain('export default')
    expect(output).toContain('satisfies Partial<ArchDiagramConfig>')
  })

  it('only writes non-default fields (sparse diff)', () => {
    const output = serializeConfig(DEFAULT_CONFIG)
    expect(output.trim()).toBe([
      "import type { ArchDiagramConfig } from './scripts/archdiagram/types.js'",
      '',
      'export default {',
      '} satisfies Partial<ArchDiagramConfig>',
    ].join('\n'))
  })

  it('writes changed fields correctly', () => {
    const config: ArchDiagramConfig = {
      ...DEFAULT_CONFIG,
      srcDir: 'lib',
      outputDir: 'out',
    }
    const output = serializeConfig(config)
    expect(output).toContain("srcDir: 'lib'")
    expect(output).toContain("outputDir: 'out'")
  })
})

describe('saveConfig round-trip', () => {
  it('round-trip: save then load equals original (minus apiKey)', async () => {
    const tmpFile = path.join(os.tmpdir(), `archdiagram-test-${Date.now()}.ts`)
    const config: ArchDiagramConfig = {
      ...DEFAULT_CONFIG,
      srcDir: 'custom-src',
      llm: { ...DEFAULT_CONFIG.llm, provider: 'openai', model: 'gpt-4o' },
    }

    saveConfig(config, tmpFile)
    const loaded = await loadConfigFile(tmpFile)

    expect(loaded.srcDir).toBe('custom-src')
    expect(loaded.llm.provider).toBe('openai')
    expect(loaded.llm.model).toBe('gpt-4o')
    expect(loaded.llm.apiKey).toBeUndefined()

    fs.unlinkSync(tmpFile)
  })
})
