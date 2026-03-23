import type { ArchDiagramConfig, PipelineResult, PhaseResult, RenderResult, ImportGraph, ArchitectureGraph, LayoutedDiagram, LLMConfig } from './types.js'
import { extractImportGraph, extractSymbolMap } from './phases/analyze.js'
import { resolveBarrelExports } from './utils/barrel-resolver.js'
import { buildUnifiedGraph } from './utils/graph-utils.js'
import { orchestrateLLMReasoning } from './phases/reason.js'
import { computeLayout } from './phases/layout.js'
import { renderExcalidraw } from './renderers/excalidraw.js'
import { renderMermaid } from './renderers/mermaid.js'
import { renderToCanvas } from './renderers/canvas.js'
import { renderImage } from './renderers/image.js'
import { parseCliFlags, mergeConfig, DEFAULT_CONFIG } from './config.js'

export interface PipelineOptions {
  dryRun?: boolean
  validateOnly?: boolean
  phase?: string
}

export async function runPipeline(
  config: ArchDiagramConfig,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const startTime = Date.now()
  const phases: PhaseResult[] = []
  const outputs: RenderResult[] = []

  let unifiedGraph: ImportGraph
  {
    const t0 = Date.now()
    try {
      const analysisConfig = {
        srcDir: config.srcDir,
        tsConfigPath: config.tsConfigPath,
        exclude: config.exclude,
      }
      const importGraph = await extractImportGraph(analysisConfig)
      const resolved = resolveBarrelExports(importGraph)
      const symbolNodes = await extractSymbolMap(analysisConfig)
      unifiedGraph = buildUnifiedGraph(resolved, symbolNodes)
      phases.push({ phase: 'analyze', success: true, duration: Date.now() - t0 })
    } catch (e) {
      phases.push({
        phase: 'analyze',
        success: false,
        duration: Date.now() - t0,
        error: (e as Error).message,
      })
      return { phases, outputs, duration: Date.now() - startTime }
    }
  }

  if (options.validateOnly || options.phase === 'analyze') {
    return { phases, outputs, duration: Date.now() - startTime }
  }

  let archGraph: ArchitectureGraph
  {
    const t0 = Date.now()
    try {
      archGraph = await orchestrateLLMReasoning(unifiedGraph, config.llm)
      phases.push({ phase: 'reason', success: true, duration: Date.now() - t0 })
    } catch (e) {
      phases.push({
        phase: 'reason',
        success: false,
        duration: Date.now() - t0,
        error: (e as Error).message,
      })
      archGraph = { groups: [], relationships: [], c4Level: 1 as const }
    }
  }

  if (options.phase === 'reason') {
    return { phases, outputs, duration: Date.now() - startTime }
  }

  let layoutedDiagram: LayoutedDiagram
  {
    const t0 = Date.now()
    try {
      layoutedDiagram = await computeLayout(archGraph, { direction: config.style.direction })
      phases.push({ phase: 'layout', success: true, duration: Date.now() - t0 })
    } catch (e) {
      phases.push({
        phase: 'layout',
        success: false,
        duration: Date.now() - t0,
        error: (e as Error).message,
      })
      return { phases, outputs, duration: Date.now() - startTime }
    }
  }

  if (options.phase === 'layout') {
    return { phases, outputs, duration: Date.now() - startTime }
  }

  if (!options.dryRun) {
    const t0 = Date.now()
    const outputDir = config.outputDir

    const renderPromises = [
      renderExcalidraw(layoutedDiagram, outputDir),
      renderMermaid(archGraph, outputDir),
      renderToCanvas(layoutedDiagram),
    ]

    const renderResults = await Promise.allSettled(renderPromises)
    for (const r of renderResults) {
      if (r.status === 'fulfilled') {
        outputs.push(r.value)
      } else {
        outputs.push({
          format: 'unknown',
          filePath: '',
          success: false,
          error: (r.reason as Error)?.message,
        })
      }
    }

    const mermaidResult = outputs.find(o => o.format === 'mermaid' && o.success)
    if (mermaidResult) {
      try {
        const imageResults = await renderImage(mermaidResult.filePath, outputDir)
        outputs.push(...imageResults)
      } catch (e) {
        console.warn(`[pipeline] Image render failed: ${(e as Error).message}`)
      }
    }

    phases.push({
      phase: 'render',
      success: outputs.some(o => o.success),
      duration: Date.now() - t0,
    })
  }

  return { phases, outputs, duration: Date.now() - startTime }
}

export async function runPipelineFromFlags(argv: string[]): Promise<PipelineResult> {
  const cliFlags = parseCliFlags(argv)
  const config = mergeConfig(DEFAULT_CONFIG, cliFlags)

  const options: PipelineOptions = {
    dryRun: argv.includes('--dry-run'),
    validateOnly: argv.includes('--validate-only'),
    phase: argv.includes('--phase') ? argv[argv.indexOf('--phase') + 1] : undefined,
  }

  if (argv.includes('--mode')) {
    const modeIdx = argv.indexOf('--mode')
    const modeValue = argv[modeIdx + 1]
    const envKeyMap: Record<string, { envVar: string; provider: LLMConfig['provider'] }> = {
      full: { envVar: 'ANTHROPIC_API_KEY', provider: 'anthropic' },
      openai: { envVar: 'OPENAI_API_KEY', provider: 'openai' },
      openrouter: { envVar: 'OPENROUTER_API_KEY', provider: 'openrouter' },
      llmapi: { envVar: 'LLMAPI_API_KEY', provider: 'llmapi' },
    }

    if (modeValue && envKeyMap[modeValue]) {
      const { envVar, provider } = envKeyMap[modeValue]
      const apiKey = process.env[envVar]
      if (apiKey) {
        config.llm = { ...config.llm, provider, apiKey }
      }
    } else if (modeValue === 'subscription') {
      config.llm = { ...config.llm, provider: 'claude-subscription' }
    } else if (modeValue === 'static') {
      config.llm = { ...config.llm, provider: 'none' }
    }
  }

  return runPipeline(config, options)
}
