import fs from 'fs'
import path from 'path'
import type { ArchitectureGraph, RenderResult } from '../types.js'

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&').toLowerCase()
}

function sanitizeLabel(label: string): string {
  return label.replace(/["{}:()\n]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function renderMermaid(
  archGraph: ArchitectureGraph,
  outputDir: string,
  filename = 'system-overview'
): Promise<RenderResult> {
  const filePath = path.join(outputDir, `${filename}.md`)
  try {
    const lines: string[] = ['graph LR']

    for (const group of archGraph.groups) {
      const groupId = sanitizeId(group.name)
      const groupLabel = sanitizeLabel(group.name)
      lines.push(`  subgraph ${groupId}["${groupLabel}"]`)
      for (const file of group.files) {
        const fileId = sanitizeId(file.replace(/\//g, '_').replace(/\.ts$/, ''))
        const fileLabel = sanitizeLabel(path.basename(file, '.ts'))
        lines.push(`    ${fileId}["${fileLabel}"]`)
      }
      lines.push('  end')
    }

    for (const rel of archGraph.relationships) {
      const fromId = sanitizeId(rel.from)
      const toId = sanitizeId(rel.to)
      const label = sanitizeLabel(rel.label)
      lines.push(`  ${fromId} -->|"${label}"| ${toId}`)
    }

    const mermaidContent = lines.join('\n')
    const markdown = `# Architecture: System Overview\n\n\`\`\`mermaid\n${mermaidContent}\n\`\`\`\n`

    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(filePath, markdown)

    return { format: 'mermaid', filePath, success: true }
  } catch (e) {
    return { format: 'mermaid', filePath: '', success: false, error: (e as Error).message }
  }
}
