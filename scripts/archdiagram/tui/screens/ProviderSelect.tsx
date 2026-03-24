import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { ScreenProps } from '../types.js'
import type { LLMProvider } from '../../types.js'

interface ProviderOption {
  value: LLMProvider
  label: string
  description: string
  envVar?: string
}

const PROVIDERS: ProviderOption[] = [
  { value: 'none', label: 'Static (no LLM)', description: 'Fast, no API key needed' },
  { value: 'anthropic', label: 'Anthropic API', description: 'Requires ANTHROPIC_API_KEY', envVar: 'ANTHROPIC_API_KEY' },
  { value: 'claude-subscription', label: 'Claude Subscription', description: 'Uses local claude CLI login' },
  { value: 'openai', label: 'OpenAI', description: 'Requires OPENAI_API_KEY', envVar: 'OPENAI_API_KEY' },
  { value: 'openrouter', label: 'OpenRouter', description: 'Requires OPENROUTER_API_KEY', envVar: 'OPENROUTER_API_KEY' },
  { value: 'llmapi', label: 'llmapi.ai', description: 'Requires LLMAPI_API_KEY', envVar: 'LLMAPI_API_KEY' },
]

function hasEnvKey(envVar: string | undefined): boolean {
  if (!envVar) return false
  return !!process.env[envVar]
}

export function ProviderSelect({ setState, setScreen }: ScreenProps): React.JSX.Element {
  const [focusedIndex, setFocusedIndex] = useState(0)

  useInput((_input, key) => {
    if (key.escape) {
      setScreen('welcome')
      return
    }
    if (key.upArrow) {
      setFocusedIndex(i => (i - 1 + PROVIDERS.length) % PROVIDERS.length)
      return
    }
    if (key.downArrow) {
      setFocusedIndex(i => (i + 1) % PROVIDERS.length)
      return
    }
    if (key.return) {
      const provider = PROVIDERS[focusedIndex].value
      setState(s => ({ ...s, config: { ...s.config, llm: { ...s.config.llm, provider } } }))
      setScreen('config')
    }
  })

  const focused = PROVIDERS[focusedIndex]

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Select LLM Provider</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {PROVIDERS.map((p, i) => {
          const isFocused = i === focusedIndex
          const envOk = p.envVar ? hasEnvKey(p.envVar) : false
          return (
            <Box key={p.value}>
              <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
                {isFocused ? '❯ ' : '  '}
              </Text>
              <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
                {p.label}
              </Text>
              {p.envVar && (
                <Text color={envOk ? 'green' : 'red'}>
                  {envOk ? '  ✓' : '  ✗'}
                </Text>
              )}
            </Box>
          )
        })}
      </Box>

      <Box marginBottom={1} paddingX={1} borderStyle="single" borderColor="gray">
        <Box flexDirection="column">
          <Text dimColor>{focused.description}</Text>
          {focused.envVar && (
            <Text color={hasEnvKey(focused.envVar) ? 'green' : 'yellow'}>
              {hasEnvKey(focused.envVar) ? '✓ env var set' : '✗ env var not set'}
            </Text>
          )}
        </Box>
      </Box>

      <Box>
        <Text dimColor>← Back (Escape)</Text>
      </Box>
    </Box>
  )
}
