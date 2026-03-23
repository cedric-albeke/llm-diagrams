#!/usr/bin/env tsx
import path from 'path'
import { loadConfigFile, parseCliFlags, mergeConfig, validateConfig } from './archdiagram/config.js'
import { runPipeline } from './archdiagram/index.js'

function printHelp(): void {
  console.log(`
Architecture Diagram Generator

Usage: npx tsx scripts/generate-architecture-diagram.ts [options]

Options:
  --help              Show this help
  --mode              static|full|auto (default: auto)
  --src-dir           Source directory (default: src)
  --output-dir        Output directory (default: docs/architecture)
  --exclude           Comma-separated patterns to exclude
  --format            excalidraw,mermaid,canvas,svg,png
  --dry-run           Skip file writes
  --validate-only     Run analysis only, no diagram generation
  --phase             analyze|reason|layout|render

Examples:
  npm run docs:diagram:static
  npx tsx scripts/generate-architecture-diagram.ts --mode static --src-dir src
  ANTHROPIC_API_KEY=sk-... npm run docs:diagram:full
  `)
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)

  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  const configFilePath = path.resolve(process.cwd(), 'archdiagram.config.ts')
  const fileConfig = await loadConfigFile(configFilePath)

  const cliFlags = parseCliFlags(argv)
  let config = mergeConfig(fileConfig, cliFlags)

  const modeIdx = argv.indexOf('--mode')
  const modeArg = modeIdx !== -1 ? argv[modeIdx + 1] : undefined

  if (modeArg === 'full') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('Error: --mode full requires ANTHROPIC_API_KEY env var')
      process.exit(1)
    }
    config = { ...config, llm: { ...config.llm, provider: 'anthropic', apiKey } }
  } else if (modeArg === 'static') {
    config = { ...config, llm: { ...config.llm, provider: 'none' } }
  } else {
    const apiKey = process.env.ANTHROPIC_API_KEY
    config = { ...config, llm: { ...config.llm, provider: apiKey ? 'anthropic' : 'none', ...(apiKey ? { apiKey } : {}) } }
  }

  const validation = validateConfig(config)
  if (!validation.valid) {
    console.error('Configuration errors:')
    for (const err of validation.errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }

  console.log(`Generating architecture diagrams...`)
  console.log(`  Source: ${config.srcDir}`)
  console.log(`  Output: ${config.outputDir}`)
  console.log(`  LLM: ${config.llm.provider}`)

  const options = {
    dryRun: argv.includes('--dry-run'),
    validateOnly: argv.includes('--validate-only'),
    phase: argv.includes('--phase') ? argv[argv.indexOf('--phase') + 1] : undefined,
  }

  const result = await runPipeline(config, options)

  console.log(`\nCompleted in ${result.duration}ms`)
  for (const phase of result.phases) {
    const status = phase.success ? '✓' : '✗'
    console.log(`  ${status} ${phase.phase} (${phase.duration}ms)${phase.error ? ': ' + phase.error : ''}`)
  }

  const successfulOutputs = result.outputs.filter(o => o.success)
  if (successfulOutputs.length > 0) {
    console.log('\nOutputs:')
    for (const output of successfulOutputs) {
      console.log(`  ${output.format}: ${output.filePath}`)
    }
  }

  const anyFailure = result.phases.some(p => !p.success && p.phase !== 'render')
  process.exit(anyFailure ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
