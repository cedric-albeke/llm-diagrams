import React from 'react'
import { Box, Text, useInput } from 'ink'
import type { ScreenProps } from '../types.js'
import type { LLMProvider } from '../../types.js'

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  none: 'Static (no LLM)',
  anthropic: 'Anthropic API',
  'claude-subscription': 'Claude Subscription',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  llmapi: 'llmapi.ai',
}

export function Confirm({ state, setScreen }: ScreenProps): React.JSX.Element {
  useInput((_input, key) => {
    if (key.escape) {
      setScreen('config')
      return
    }
    if (key.return) {
      setScreen('dashboard')
    }
  })

  const { config, selectedFormats } = state
  const providerLabel = PROVIDER_LABELS[config.llm.provider] ?? config.llm.provider

  const rows = [
    { label: 'Source Dir', value: config.srcDir },
    { label: 'Output Dir', value: config.outputDir },
    { label: 'LLM Provider', value: providerLabel },
    { label: 'Selected Formats', value: selectedFormats.join(', ') },
    { label: 'Dry Run', value: 'No' },
  ]

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Ready to Generate</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
        {rows.map(row => (
          <Box key={row.label}>
            <Box width={20}>
              <Text dimColor>{row.label}</Text>
            </Box>
            <Text dimColor>: </Text>
            <Text color="white">{row.value}</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column">
        <Text color="green" bold>Press Enter to run</Text>
        <Text dimColor>Press Escape to go back (config)</Text>
      </Box>
    </Box>
  )
}
