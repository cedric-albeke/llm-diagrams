import path from 'path'
import { fileURLToPath } from 'url'
import type { ImportGraph, ModuleNode, ImportEdge } from '../../scripts/archdiagram/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/archdiagram/sample-project')
export const FIXTURE_SRC = path.join(FIXTURE_PATH, 'src')
export const FIXTURE_TSCONFIG = path.join(FIXTURE_PATH, 'tsconfig.json')

export function loadExpectedGraph(): ImportGraph {
  const modules: ModuleNode[] = [
    { path: 'index.ts', isBarrel: true, exports: [], directives: [] },
    { path: 'app.ts', isBarrel: false, exports: [{ name: 'AppConfig', kind: 'interface' }, { name: 'createApp', kind: 'function' }], directives: ['use client'] },
    { path: 'services/index.ts', isBarrel: true, exports: [], directives: [] },
    { path: 'services/auth.ts', isBarrel: false, exports: [{ name: 'AuthToken', kind: 'interface' }, { name: 'AuthService', kind: 'class' }], directives: [] },
    { path: 'services/db.ts', isBarrel: false, exports: [{ name: 'QueryResult', kind: 'interface' }, { name: 'DatabaseClient', kind: 'class' }], directives: [] },
    { path: 'utils/index.ts', isBarrel: true, exports: [], directives: [] },
    { path: 'utils/logger.ts', isBarrel: false, exports: [{ name: 'Logger', kind: 'interface' }, { name: 'createLogger', kind: 'function' }], directives: [] },
  ]

  const edges: ImportEdge[] = [
    { source: 'index.ts', target: 'services/index.ts', dependencyTypes: ['re-export'] },
    { source: 'index.ts', target: 'utils/index.ts', dependencyTypes: ['re-export'] },
    { source: 'app.ts', target: 'services/auth.ts', dependencyTypes: ['import'] },
    { source: 'app.ts', target: 'services/db.ts', dependencyTypes: ['import'] },
    { source: 'app.ts', target: 'utils/logger.ts', dependencyTypes: ['import'] },
    { source: 'services/index.ts', target: 'services/auth.ts', dependencyTypes: ['re-export'] },
    { source: 'services/index.ts', target: 'services/db.ts', dependencyTypes: ['re-export'] },
    { source: 'services/auth.ts', target: 'services/db.ts', dependencyTypes: ['import'] },
    { source: 'utils/index.ts', target: 'utils/logger.ts', dependencyTypes: ['re-export'] },
  ]

  return { modules, edges }
}

export function assertValidExcalidraw(json: string): void {
  const parsed = JSON.parse(json)
  if (parsed.type !== 'excalidraw') throw new Error(`Expected type 'excalidraw', got '${parsed.type}'`)
  if (parsed.version !== 2) throw new Error(`Expected version 2, got ${parsed.version}`)
  if (!Array.isArray(parsed.elements)) throw new Error('Expected elements array')
  if (parsed.elements.length === 0) throw new Error('Expected non-empty elements array')
}

export function assertValidMermaid(content: string): void {
  if (!content.includes('graph')) throw new Error('Expected Mermaid content to include "graph"')
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 3) throw new Error('Expected at least 3 non-empty lines in Mermaid output')
}
