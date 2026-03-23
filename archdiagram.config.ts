import type { ArchDiagramConfig } from './scripts/archdiagram/types.js'

export default {
  srcDir: 'scripts/archdiagram',
  tsConfigPath: 'tsconfig.json',
  exclude: ['node_modules', 'dist'],
  outputDir: 'docs/architecture',
} satisfies Partial<ArchDiagramConfig>
