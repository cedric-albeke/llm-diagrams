import fs from 'fs'
import type { ArchDiagramConfig } from './types.js'
import { DEFAULT_CONFIG } from './config.js'

const FORBIDDEN_KEYS = new Set(['apiKey', 'baseUrl'])

function serializeValue(val: unknown, indent: number = 2): string {
  const pad = ' '.repeat(indent)
  const innerPad = ' '.repeat(indent + 2)

  if (typeof val === 'string') {
    return `'${val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val)
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    const items = val.map(item => `${innerPad}${serializeValue(item, indent + 2)}`).join(',\n')
    return `[\n${items},\n${pad}]`
  }
  if (typeof val === 'object' && val !== null) {
    const entries = Object.entries(val)
      .filter(([k]) => !FORBIDDEN_KEYS.has(k))
      .map(([k, v]) => `${innerPad}${k}: ${serializeValue(v, indent + 2)}`)
    if (entries.length === 0) return '{}'
    return `{\n${entries.join(',\n')},\n${pad}}`
  }
  return String(val)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (typeof a === 'object' && a !== null && b !== null && typeof b === 'object') {
    const aKeys = Object.keys(a as object)
    const bKeys = Object.keys(b as object)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every(k => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }
  return false
}

function computeDiff(
  config: ArchDiagramConfig,
  defaults: ArchDiagramConfig
): Partial<ArchDiagramConfig> {
  const diff: Record<string, unknown> = {}

  for (const key of Object.keys(config) as (keyof ArchDiagramConfig)[]) {
    if (FORBIDDEN_KEYS.has(key)) continue

    const configVal = config[key]
    const defaultVal = defaults[key]

    if (typeof configVal === 'object' && configVal !== null && !Array.isArray(configVal) &&
        typeof defaultVal === 'object' && defaultVal !== null && !Array.isArray(defaultVal)) {
      const nestedDiff: Record<string, unknown> = {}
      const cv = configVal as unknown as Record<string, unknown>
      const dv = defaultVal as unknown as Record<string, unknown>
      for (const nestedKey of Object.keys(cv)) {
        if (FORBIDDEN_KEYS.has(nestedKey)) continue
        if (!deepEqual(cv[nestedKey], dv[nestedKey])) {
          nestedDiff[nestedKey] = cv[nestedKey]
        }
      }
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff
      }
    } else if (!deepEqual(configVal, defaultVal)) {
      diff[key] = configVal
    }
  }

  return diff as Partial<ArchDiagramConfig>
}

export function serializeConfig(config: ArchDiagramConfig): string {
  const diff = computeDiff(config, DEFAULT_CONFIG)
  const entries = Object.entries(diff)

  const body = entries
    .map(([k, v]) => `  ${k}: ${serializeValue(v, 2)}`)
    .join(',\n')

  const bodySection = entries.length > 0 ? `\n${body},\n` : '\n'

  return [
    "import type { ArchDiagramConfig } from './scripts/archdiagram/types.js'",
    '',
    `export default {${bodySection}} satisfies Partial<ArchDiagramConfig>`,
  ].join('\n')
}

export function saveConfig(config: ArchDiagramConfig, filePath: string): void {
  const content = serializeConfig(config)
  fs.writeFileSync(filePath, content, 'utf-8')
}
