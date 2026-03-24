import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderImage } from '../../scripts/archdiagram/renderers/image.js'
import os from 'os'
import path from 'path'
import fs from 'fs'

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'image-renderer-test-'))
}

describe('renderImage — no canvas, no mmdc', () => {
  beforeEach(() => {
    const connRefused = Object.assign(new Error('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3444'), { code: 'ECONNREFUSED' }),
    })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(connRefused))
    vi.mock('child_process', async (importOriginal) => {
      const actual = await importOriginal<typeof import('child_process')>()
      return {
        ...actual,
        execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null) => void) => {
          cb(new Error('mmdc not found'))
        }),
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('returns 2 results without throwing', async () => {
    const outputDir = makeTempDir()
    const results = await renderImage('/nonexistent/file.mmd', outputDir)
    expect(results).toHaveLength(2)
  })

  it('first result has format svg', async () => {
    const outputDir = makeTempDir()
    const results = await renderImage('/nonexistent/file.mmd', outputDir)
    expect(results[0].format).toBe('svg')
  })

  it('second result has format png', async () => {
    const outputDir = makeTempDir()
    const results = await renderImage('/nonexistent/file.mmd', outputDir)
    expect(results[1].format).toBe('png')
  })

  it('both results have success=false when neither canvas nor mmdc available', async () => {
    const outputDir = makeTempDir()
    const results = await renderImage('/nonexistent/file.mmd', outputDir)
    expect(results[0].success).toBe(false)
    expect(results[1].success).toBe(false)
  })

  it('both results have empty filePath on failure', async () => {
    const outputDir = makeTempDir()
    const results = await renderImage('/nonexistent/file.mmd', outputDir)
    expect(results[0].filePath).toBe('')
    expect(results[1].filePath).toBe('')
  })

  it('both results have error message on failure', async () => {
    const outputDir = makeTempDir()
    const results = await renderImage('/nonexistent/file.mmd', outputDir)
    expect(results[0].error).toContain('svg')
    expect(results[1].error).toContain('png')
  })

  it('creates outputDir if it does not exist', async () => {
    const base = makeTempDir()
    const outputDir = path.join(base, 'nested', 'dir')
    await renderImage('/nonexistent/file.mmd', outputDir)
    expect(fs.existsSync(outputDir)).toBe(true)
  })
})

describe('renderImage — canvas available', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns success=true with filePath when canvas responds with ok', async () => {
    const outputDir = makeTempDir()
    const fakeBuffer = Buffer.from('<svg></svg>')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBuffer.buffer,
    }))

    const results = await renderImage('/some/file.mmd', outputDir)
    expect(results[0].success).toBe(true)
    expect(results[0].filePath).toContain('system-overview.svg')
    expect(results[1].success).toBe(true)
    expect(results[1].filePath).toContain('system-overview.png')
  })

  it('writes file to disk when canvas export succeeds', async () => {
    const outputDir = makeTempDir()
    const fakeBuffer = Buffer.from('<svg>test</svg>')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBuffer.buffer,
    }))

    const results = await renderImage('/some/file.mmd', outputDir)
    expect(fs.existsSync(results[0].filePath)).toBe(true)
  })
})
