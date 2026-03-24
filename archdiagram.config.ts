import type { ArchDiagramConfig } from './scripts/archdiagram/types.js'

export default {
  srcDir: 'scripts/archdiagram',
  llm: {
    provider: 'claude-subscription',
  },
} satisfies Partial<ArchDiagramConfig>