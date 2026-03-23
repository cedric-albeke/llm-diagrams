import fs from 'fs'
import path from 'path'
import type { ArchDiagramConfig } from './types.js'

export const DEFAULT_CONFIG: ArchDiagramConfig = {
  srcDir: 'src',
  tsConfigPath: 'tsconfig.json',
  exclude: ['node_modules', '**/*.test.*', '**/*.spec.*', 'dist'],
  outputDir: 'docs/architecture',
  llm: {
    provider: 'none',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.1,
  },
  style: {
    direction: 'RIGHT',
    colorScheme: {},
    fontSize: 16,
  },
}

function deepMerge<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideVal = override[key]
    const baseVal = base[key]
    if (
      overrideVal !== undefined &&
      overrideVal !== null &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal as object, overrideVal as object) as T[keyof T]
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[keyof T]
    }
  }
  return result
}

export async function loadConfigFile(filePath?: string): Promise<ArchDiagramConfig> {
  if (!filePath) {
    return DEFAULT_CONFIG
  }

  try {
    const absolutePath = path.resolve(filePath)
    const mod = await import(absolutePath)
    const fileConfig: Partial<ArchDiagramConfig> = mod.default ?? mod

    const merged = deepMerge(DEFAULT_CONFIG, fileConfig)
    if (fileConfig.llm) {
      merged.llm = deepMerge(DEFAULT_CONFIG.llm, fileConfig.llm)
    }
    if (fileConfig.style) {
      merged.style = deepMerge(DEFAULT_CONFIG.style, fileConfig.style)
    }
    return merged
  } catch {
    return DEFAULT_CONFIG
  }
}

export function parseCliFlags(argv: string[]): Partial<ArchDiagramConfig> {
  const result: Partial<ArchDiagramConfig> = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    switch (arg) {
      case '--src-dir':
        if (next && !next.startsWith('--')) {
          result.srcDir = next
          i++
        }
        break

      case '--output-dir':
        if (next && !next.startsWith('--')) {
          result.outputDir = next
          i++
        }
        break

      case '--mode':
        if (next && !next.startsWith('--')) {
          const provider = next === 'full'
            ? 'anthropic'
            : next === 'subscription'
              ? 'claude-subscription'
              : 'none'
          result.llm = {
            ...result.llm,
            provider,
          } as ArchDiagramConfig['llm']
          i++
        }
        break

      case '--exclude':
        if (next && !next.startsWith('--')) {
          const values = next.split(',').map(v => v.trim()).filter(Boolean)
          result.exclude = [...(result.exclude ?? []), ...values]
          i++
        }
        break

      case '--format':
      case '--phase':
        if (next && !next.startsWith('--')) {
          i++
        }
        break

      default:
        break
    }
  }

  return result
}

export function mergeConfig(
  file: ArchDiagramConfig,
  cli: Partial<ArchDiagramConfig>
): ArchDiagramConfig {
  const merged = deepMerge(file, cli)

  if (cli.llm) {
    merged.llm = deepMerge(file.llm, cli.llm)
  }
  if (cli.style) {
    merged.style = deepMerge(file.style, cli.style)
  }

  return merged
}

export function validateConfig(config: ArchDiagramConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!fs.existsSync(config.srcDir)) {
    errors.push(`srcDir does not exist: ${config.srcDir}`)
  }

  if (!fs.existsSync(config.tsConfigPath)) {
    errors.push(`tsConfigPath does not exist: ${config.tsConfigPath}`)
  }

  try {
    fs.mkdirSync(config.outputDir, { recursive: true })
  } catch (err) {
    errors.push(`outputDir is not writable: ${config.outputDir} (${(err as Error).message})`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
