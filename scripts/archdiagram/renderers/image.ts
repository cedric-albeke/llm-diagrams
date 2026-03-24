import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import type { RenderResult } from '../types.js'

const execFileAsync = promisify(execFile)
const CANVAS_URL = 'http://localhost:3111'

async function tryCanvasExport(outputDir: string, format: 'svg' | 'png'): Promise<string | null> {
  try {
    const response = await fetch(`${CANVAS_URL}/api/export/image?format=${format}`)
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    const filePath = path.join(outputDir, `system-overview.${format}`)
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return filePath
  } catch {
    return null
  }
}

async function tryMmdcExport(mermaidFile: string, outputDir: string, format: 'svg' | 'png'): Promise<string | null> {
  const filePath = path.join(outputDir, `system-overview.${format}`)
  const args = ['mmdc', '-i', mermaidFile, '-o', filePath, '-w', '2048', '--backgroundColor', 'transparent']
  if (format === 'png') {
    args.push('-s', '2')
  }
  try {
    await execFileAsync('npx', args, { timeout: 30000 })
    return filePath
  } catch {
    return null
  }
}

export async function renderImage(mermaidFilePath: string, outputDir: string): Promise<RenderResult[]> {
  fs.mkdirSync(outputDir, { recursive: true })
  const results: RenderResult[] = []

  for (const format of ['svg', 'png'] as const) {
    let filePath: string | null = null

    filePath = await tryCanvasExport(outputDir, format)

    if (!filePath) {
      filePath = await tryMmdcExport(mermaidFilePath, outputDir, format)
    }

    if (filePath) {
      results.push({ format, filePath, success: true })
    } else {
      results.push({ format, filePath: '', success: false, error: `Neither canvas nor mmdc available for ${format}` })
    }
  }

  return results
}
