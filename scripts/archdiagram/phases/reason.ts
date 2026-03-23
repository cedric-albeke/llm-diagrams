import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { LLMConfig, ModuleNode, ImportEdge, FileSummary, ImportGraph, ArchitectureGraph, ModuleGroup, ModuleRelationship } from '../types.js'

export const FILE_ANALYST_SYSTEM_PROMPT = `You are a TypeScript codebase analyst.
Your job is to analyze TypeScript source files and classify each file's purpose and role.

RULES:
- Only analyze files from the VALID FILE PATHS list below
- Never reference files not in the VALID FILE PATHS list
- Classify each file's role as one of: component, hook, service, util, config, type, context, unknown
- Be concise in purpose descriptions (max 1-2 sentences)
- Output MUST be valid JSON array, no markdown fences

Output format:
[
  { "filePath": "path/to/file.ts", "purpose": "brief description", "role": "service" },
  ...
]`

export const ARCHITECT_SYSTEM_PROMPT = `You are a software architect analyzing a TypeScript codebase.
Your job is to group source files into meaningful architectural modules and identify relationships.

RULES:
- Only use files from the VALID FILE PATHS list below
- Group by user-facing FEATURES, not code layers
  GOOD: "Payment Processing", "User Authentication", "Dashboard"
  BAD: "Services", "Components", "Utils"
- Every file must appear in exactly ONE group
- Relationships must reference exact group names you define
- Output MUST be valid JSON, no markdown fences

Output format:
{
  "groups": [
    { "name": "Group Name", "description": "what this module does", "files": ["path/to/file.ts"], "role": "backend" }
  ],
  "relationships": [
    { "from": "Group A", "to": "Group B", "label": "calls API", "style": "sync" }
  ]
}`

export const ModuleRoleSchema = z.enum(['component', 'hook', 'service', 'util', 'config', 'type', 'context', 'unknown'])
export const ModuleGroupRoleSchema = z.enum(['frontend', 'backend', 'shared', 'external'])
export const RelationshipStyleSchema = z.enum(['sync', 'async', 'data'])

export const FileSummarySchema = z.object({
  filePath: z.string(),
  purpose: z.string(),
  role: ModuleRoleSchema,
})

export const ModuleGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  files: z.array(z.string()),
  role: ModuleGroupRoleSchema,
})

export const ModuleRelationshipSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string(),
  style: RelationshipStyleSchema,
})

export const ArchitectureOutputSchema = z.object({
  groups: z.array(ModuleGroupSchema).min(1),
  relationships: z.array(ModuleRelationshipSchema),
})

export function createFileSummarySchemaWithPaths(validPaths: string[]) {
  const pathSet = new Set(validPaths)
  return FileSummarySchema.superRefine((data, ctx) => {
    if (!pathSet.has(data.filePath)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Hallucinated file path: "${data.filePath}" not in valid paths set`,
      })
    }
  })
}

export function createArchitectureSchemaWithPaths(validPaths: string[], validGroupNames?: string[]) {
  const pathSet = new Set(validPaths)

  return ArchitectureOutputSchema.superRefine((data, ctx) => {
    const invalidFiles = data.groups.flatMap(g => g.files.filter(f => !pathSet.has(f)))
    if (invalidFiles.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Hallucinated file paths: ${invalidFiles.join(', ')}`,
      })
    }

    if (validGroupNames) {
      const groupSet = new Set(validGroupNames)
      const badRels = data.relationships.filter(r => !groupSet.has(r.from) || !groupSet.has(r.to))
      if (badRels.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Relationship references unknown group names',
        })
      }
    }
  })
}

export function buildAnalystPrompt(batch: ModuleNode[]): string {
  const validPaths = batch.map(m => m.path)

  const fileDescriptions = batch.map(m => {
    const exportsStr = m.exports.length > 0
      ? m.exports.map(e => `${e.name} (${e.kind})`).join(', ')
      : 'none detected'
    const directivesStr = m.directives.length > 0 ? m.directives.join(', ') : 'none'

    return `File: ${m.path}
  Exports: ${exportsStr}
  Directives: ${directivesStr}
  Is barrel: ${m.isBarrel}
  Lines: ${m.lineCount ?? 'unknown'}`
  }).join('\n\n')

  return `VALID FILE PATHS (only these may appear in your response):
${validPaths.map(p => `  - ${p}`).join('\n')}

FILES TO ANALYZE:
${fileDescriptions}

Analyze each file and return a JSON array with one entry per file.`
}

export async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  config: LLMConfig,
  attempt = 1
): Promise<T> {
  if (config.provider === 'none') {
    throw new Error('LLM provider is none — cannot make API calls')
  }

  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: config.model ?? 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    temperature: config.temperature ?? 0.1,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  let text = content.text

  text = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    if (attempt < 3) {
      console.log(`[LLM] Parse error attempt ${attempt}, retrying...`)
      const retryPrompt = `${userPrompt}\n\nPREVIOUS ATTEMPT FAILED: ${(e as Error).message}\nReturn ONLY valid JSON, no markdown.`
      return callLLM(systemPrompt, retryPrompt, schema, config, attempt + 1)
    }
    throw new Error(`JSON parse failed after ${attempt} attempts: ${(e as Error).message}`)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    if (attempt < 3) {
      const errors = result.error.issues.map(i => i.message).join('; ')
      console.log(`[LLM] Schema validation failed attempt ${attempt}: ${errors}`)
      const retryPrompt = `${userPrompt}\n\nVALIDATION ERRORS: ${errors}\nFix these issues and return valid JSON.`
      return callLLM(systemPrompt, retryPrompt, schema, config, attempt + 1)
    }
    throw new Error(`Schema validation failed: ${result.error.message}`)
  }

  return result.data
}

export async function batchAnalyze(
  nodes: ModuleNode[],
  config: LLMConfig
): Promise<FileSummary[]> {
  if (config.provider === 'none') {
    return []
  }

  const dirGroups = new Map<string, ModuleNode[]>()
  for (const node of nodes) {
    const dir = node.path.includes('/')
      ? node.path.split('/').slice(0, -1).join('/')
      : ''
    const group = dirGroups.get(dir) ?? []
    group.push(node)
    dirGroups.set(dir, group)
  }

  const batches = Array.from(dirGroups.entries())
  const totalBatches = batches.length

  const results = await Promise.allSettled(
    batches.map(async ([dir, batchNodes], i) => {
      console.log(`[LLM] Analyzing batch ${i + 1}/${totalBatches}: ${dir || 'root'} (${batchNodes.length} files)`)
      const prompt = buildAnalystPrompt(batchNodes)
      const singleSchema = createFileSummarySchemaWithPaths(batchNodes.map(n => n.path))
      const arraySchema = z.array(singleSchema)
      return callLLM<FileSummary[]>(FILE_ANALYST_SYSTEM_PROMPT, prompt, arraySchema, config)
    })
  )

  const summaries: FileSummary[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      summaries.push(...result.value)
    } else {
      console.warn(`[LLM] Batch failed: ${result.reason}`)
    }
  }

  return summaries
}

// ============================================
// Response Validation + Hallucination Prevention
// ============================================

export interface ValidationResult {
  valid: boolean
  errors: string[]
  layer: number // which layer failed (1-6), 0 if all pass
}

export function validateArchitectureResponse(
  rawJson: unknown,
  validPaths: string[],
  inputFiles: string[]
): ValidationResult {
  const pathSet = new Set(validPaths)

  // Layer 1: JSON parse (already parsed if we get here, but check it's an object)
  if (typeof rawJson !== 'object' || rawJson === null) {
    return { valid: false, errors: ['Response is not a JSON object'], layer: 1 }
  }

  // Layer 2: Zod schema check
  const schemaResult = ArchitectureOutputSchema.safeParse(rawJson)
  if (!schemaResult.success) {
    return {
      valid: false,
      errors: schemaResult.error.issues.map(i => i.message),
      layer: 2,
    }
  }

  const data = schemaResult.data

  // Layer 3: File path validation
  const hallucinated: string[] = []
  for (const group of data.groups) {
    for (const file of group.files) {
      if (!pathSet.has(file)) hallucinated.push(file)
    }
  }
  if (hallucinated.length > 0) {
    return {
      valid: false,
      errors: [`Hallucinated paths: ${hallucinated.join(', ')}`],
      layer: 3,
    }
  }

  // Layer 4: Relationship validation (from/to must be group names)
  const groupNames = new Set(data.groups.map(g => g.name))
  const invalidRels: string[] = []
  for (const rel of data.relationships) {
    if (!groupNames.has(rel.from)) invalidRels.push(`'${rel.from}' (from)`)
    if (!groupNames.has(rel.to)) invalidRels.push(`'${rel.to}' (to)`)
  }
  if (invalidRels.length > 0) {
    return {
      valid: false,
      errors: [`Invalid relationship groups: ${invalidRels.join(', ')}`],
      layer: 4,
    }
  }

  // Layer 5: Coverage validation (every input file in exactly one group)
  const assignedFiles = new Map<string, string>() // file → group name
  for (const group of data.groups) {
    for (const file of group.files) {
      if (assignedFiles.has(file)) {
        return {
          valid: false,
          errors: [`File appears in multiple groups: ${file}`],
          layer: 5,
        }
      }
      assignedFiles.set(file, group.name)
    }
  }
  const orphans = inputFiles.filter(f => !assignedFiles.has(f))
  if (orphans.length > 0) {
    return {
      valid: false,
      errors: [`Orphan files not assigned to any group: ${orphans.join(', ')}`],
      layer: 5,
    }
  }

  // Layer 6: Every group has at least one file
  const emptyGroups = data.groups.filter(g => g.files.length === 0)
  if (emptyGroups.length > 0) {
    return {
      valid: false,
      errors: [`Empty groups: ${emptyGroups.map(g => g.name).join(', ')}`],
      layer: 6,
    }
  }

  return { valid: true, errors: [], layer: 0 }
}

export function buildRetryPrompt(originalPrompt: string, errors: string[]): string {
  return `${originalPrompt}

PREVIOUS RESPONSE WAS INVALID. Fix these issues:
${errors.map(e => `- ${e}`).join('\n')}

Return corrected JSON only, no explanations.`
}

export async function orchestrateLLMReasoning(
  graph: ImportGraph,
  config: LLMConfig
): Promise<ArchitectureGraph> {
  // Provider=none: use directory-based fallback immediately
  if (config.provider === 'none') {
    return buildDirectoryFallback(graph)
  }

  try {
    // Phase 2a: File Analyst (batched by directory)
    const summaries = await batchAnalyze(graph.modules.filter(m => !m.isBarrel), config)

    // Phase 2b: Architect (single call with all summaries)
    const validPaths = graph.modules.map(m => m.path)
    const architectPrompt = buildArchitectPrompt(summaries, graph.edges)

    let lastError: string[] = []
    let architectData: unknown = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      const prompt = attempt === 1 ? architectPrompt : buildRetryPrompt(architectPrompt, lastError)

      try {
        architectData = await callLLM(ARCHITECT_SYSTEM_PROMPT, prompt, ArchitectureOutputSchema, config)

        // Validate
        const validation = validateArchitectureResponse(
          architectData,
          validPaths,
          graph.modules.map(m => m.path)
        )

        if (validation.valid) {
          const data = architectData as { groups: ModuleGroup[], relationships: ModuleRelationship[] }
          return { groups: data.groups, relationships: data.relationships, c4Level: 1 }
        }

        lastError = validation.errors
        console.log(`[LLM] Validation failed layer ${validation.layer}, attempt ${attempt}`)
      } catch (e) {
        lastError = [(e as Error).message]
        console.warn(`[LLM] Architect call failed attempt ${attempt}: ${(e as Error).message}`)
      }
    }

    // All retries exhausted — fallback
    console.warn('[LLM] All retries exhausted, using directory fallback')
    return buildDirectoryFallback(graph)

  } catch (e) {
    console.warn(`[LLM] Reasoning failed: ${(e as Error).message}, using directory fallback`)
    return buildDirectoryFallback(graph)
  }
}

export function buildDirectoryFallback(graph: ImportGraph): ArchitectureGraph {
  // Group files by top-level directory
  const dirMap = new Map<string, string[]>()

  for (const mod of graph.modules) {
    const parts = mod.path.split('/')
    const topDir = parts.length > 1 ? parts[0] : 'root'
    const group = dirMap.get(topDir) ?? []
    group.push(mod.path)
    dirMap.set(topDir, group)
  }

  const groups: ModuleGroup[] = Array.from(dirMap.entries()).map(([dir, files]) => ({
    name: dir.charAt(0).toUpperCase() + dir.slice(1).replace(/-/g, ' '),
    description: `${dir} directory`,
    files,
    role: dir === 'root' ? 'shared' : 'backend',
  }))

  return { groups, relationships: [], c4Level: 1 }
}

export function buildArchitectPrompt(summaries: FileSummary[], edges: ImportEdge[]): string {
  const validPaths = summaries.map(s => s.filePath)

  const summaryStr = summaries.map(s =>
    `${s.filePath}: ${s.purpose} (role: ${s.role})`
  ).join('\n')

  const edgeStr = edges.slice(0, 50).map(e => `${e.source} → ${e.target}`).join('\n')

  return `VALID FILE PATHS (only these may appear in your response's "files" arrays):
${validPaths.map(p => `  - ${p}`).join('\n')}

FILE SUMMARIES:
${summaryStr}

IMPORT RELATIONSHIPS (sample):
${edgeStr}

Group these files into architectural modules and identify high-level relationships between modules.
Return valid JSON following the required format.`
}
