import React, { useEffect, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { ScreenProps } from '../types.js'
import type { ArchDiagramConfig, LLMProvider } from '../../types.js'
import { validateConfig } from '../../config.js'

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'toggle'
  hint?: string
}

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  none: 'Static (no LLM)',
  anthropic: 'Anthropic API',
  'claude-subscription': 'Claude Subscription',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  llmapi: 'llmapi.ai',
}

const PATH_FIELDS = new Set(['srcDir', 'tsConfigPath', 'outputDir'])

function buildFields(provider: LLMProvider): FieldDef[] {
  const showModel = provider !== 'none' && provider !== 'claude-subscription'
  return [
    { key: 'srcDir', label: 'Source Directory', type: 'text' },
    { key: 'tsConfigPath', label: 'tsconfig Path', type: 'text' },
    { key: 'outputDir', label: 'Output Directory', type: 'text' },
    { key: 'exclude', label: 'Exclude Patterns', type: 'text', hint: 'comma-separated' },
    ...(showModel ? [{ key: 'llm.model', label: 'LLM Model', type: 'text' as const }] : []),
    { key: 'llm.temperature', label: 'Temperature', type: 'text', hint: '0.0–1.0' },
    { key: 'style.direction', label: 'Layout Direction', type: 'toggle' as const, hint: 'Enter/Space toggles' },
    { key: 'style.fontSize', label: 'Font Size', type: 'text', hint: 'integer > 0' },
  ]
}

function getFieldValue(config: ArchDiagramConfig, key: string): string {
  switch (key) {
    case 'srcDir': return config.srcDir
    case 'tsConfigPath': return config.tsConfigPath
    case 'outputDir': return config.outputDir
    case 'exclude': return config.exclude.join(', ')
    case 'llm.model': return config.llm.model ?? ''
    case 'llm.temperature': return String(config.llm.temperature ?? 0.1)
    case 'style.direction': return config.style.direction
    case 'style.fontSize': return String(config.style.fontSize)
    default: return ''
  }
}

function applyFieldValue(config: ArchDiagramConfig, key: string, value: string): ArchDiagramConfig {
  switch (key) {
    case 'srcDir': return { ...config, srcDir: value }
    case 'tsConfigPath': return { ...config, tsConfigPath: value }
    case 'outputDir': return { ...config, outputDir: value }
    case 'exclude':
      return { ...config, exclude: value.split(',').map(v => v.trim()).filter(Boolean) }
    case 'llm.model': return { ...config, llm: { ...config.llm, model: value } }
    case 'llm.temperature':
      return { ...config, llm: { ...config.llm, temperature: parseFloat(value) } }
    case 'style.direction':
      return { ...config, style: { ...config.style, direction: value as 'RIGHT' | 'DOWN' } }
    case 'style.fontSize':
      return { ...config, style: { ...config.style, fontSize: parseInt(value, 10) } }
    default: return config
  }
}

function validateFieldValue(key: string, value: string): string | null {
  if (key === 'llm.temperature') {
    const n = parseFloat(value)
    return isNaN(n) || n < 0 || n > 1 ? 'Must be between 0.0 and 1.0' : null
  }
  if (key === 'style.fontSize') {
    const n = parseInt(value, 10)
    return isNaN(n) || n <= 0 ? 'Must be a positive integer' : null
  }
  return null
}

export function ConfigEditor({ state, setState, setScreen }: ScreenProps): React.JSX.Element {
  const provider = state.config.llm.provider
  const fields = buildFields(provider)
  const totalItems = fields.length + 1

  const [focusedIndex, setFocusedIndex] = useState(0)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pathErrors, setPathErrors] = useState<string[]>([])

  const initialConfig = state.config
  useEffect(() => {
    try {
      const { errors } = validateConfig(initialConfig)
      setPathErrors(errors)
    } catch (_e) {
      void _e
    }
  }, [initialConfig])

  useInput((input, key) => {
    if (editingIndex !== null) {
      if (key.escape) {
        setEditingIndex(null)
        return
      }

      if (key.return) {
        const field = fields[editingIndex]
        const error = validateFieldValue(field.key, editValue)
        if (error) {
          setFieldErrors(prev => ({ ...prev, [field.key]: error }))
          setEditingIndex(null)
          return
        }
        const newConfig = applyFieldValue(state.config, field.key, editValue)
        if (PATH_FIELDS.has(field.key)) {
          try {
            const { errors } = validateConfig(newConfig)
            setPathErrors(errors)
          } catch (_e) {
            void _e
          }
        }
        setFieldErrors(prev => {
          const next = { ...prev }
          delete next[field.key]
          return next
        })
        setState(s => ({ ...s, config: newConfig }))
        setEditingIndex(null)
        return
      }

      if (key.backspace || key.delete) {
        setEditValue(v => v.slice(0, -1))
        return
      }

      if (!key.ctrl && !key.meta && !key.tab && input) {
        setEditValue(v => v + input)
      }
    } else {
      if (key.escape) {
        setScreen('provider')
        return
      }

      if (key.upArrow) {
        setFocusedIndex(i => Math.max(0, i - 1))
        return
      }

      if (key.downArrow) {
        setFocusedIndex(i => Math.min(totalItems - 1, i + 1))
        return
      }

      if (key.return) {
        if (focusedIndex === totalItems - 1) {
          if (pathErrors.length > 0) {
            return
          }
          setScreen('formats')
          return
        }
        const field = fields[focusedIndex]
        if (field.type === 'toggle') {
          const current = getFieldValue(state.config, field.key)
          const next = current === 'RIGHT' ? 'DOWN' : 'RIGHT'
          setState(s => ({ ...s, config: applyFieldValue(s.config, field.key, next) }))
        } else {
          setEditValue(getFieldValue(state.config, field.key))
          setEditingIndex(focusedIndex)
        }
        return
      }

      if (input === ' ') {
        const field = fields[focusedIndex]
        if (field?.type === 'toggle') {
          const current = getFieldValue(state.config, field.key)
          const next = current === 'RIGHT' ? 'DOWN' : 'RIGHT'
          setState(s => ({ ...s, config: applyFieldValue(s.config, field.key, next) }))
        }
      }
    }
  })

  const providerLabel = PROVIDER_LABELS[provider] ?? provider

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Configure Diagram</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Provider: </Text>
        <Text color="cyan">{providerLabel}</Text>
        <Text dimColor> (change in provider screen)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {fields.map((field, i) => {
          const isFocused = focusedIndex === i && editingIndex === null
          const isEditing = editingIndex === i
          const displayValue = getFieldValue(state.config, field.key)
          const error = fieldErrors[field.key]

          return (
            <Box key={field.key} flexDirection="column">
              <Box>
                <Text color={isFocused || isEditing ? 'cyan' : undefined} bold={isFocused || isEditing}>
                  {isFocused || isEditing ? '❯ ' : '  '}
                </Text>
                <Box width={20}>
                  <Text color={isFocused || isEditing ? 'cyan' : undefined} bold={isFocused || isEditing}>
                    {field.label}
                  </Text>
                </Box>
                <Text dimColor>: </Text>
                {isEditing ? (
                  <Box>
                    <Text color="white">{editValue}</Text>
                    <Text inverse> </Text>
                  </Box>
                ) : (
                  <Text color={isFocused ? 'white' : 'gray'}>{displayValue || '(empty)'}</Text>
                )}
                {field.hint && !isEditing && (
                  <Text dimColor>  {field.hint}</Text>
                )}
              </Box>
              {error && (
                <Box paddingLeft={4}>
                  <Text color="red">⚠ {error}</Text>
                </Box>
              )}
            </Box>
          )
        })}

        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text
              color={focusedIndex === totalItems - 1 ? (pathErrors.length > 0 ? 'red' : 'green') : 'gray'}
              bold={focusedIndex === totalItems - 1}
            >
              {focusedIndex === totalItems - 1 ? '❯ ' : '  '}
            </Text>
            <Text
              color={focusedIndex === totalItems - 1 ? (pathErrors.length > 0 ? 'red' : 'green') : 'gray'}
              bold={focusedIndex === totalItems - 1}
            >
              → Next (Enter when done)
            </Text>
          </Box>
          {focusedIndex === totalItems - 1 && pathErrors.length > 0 && (
            <Box paddingLeft={4}>
              <Text color="red">Fix errors above before continuing</Text>
            </Box>
          )}
        </Box>
      </Box>

      {pathErrors.length > 0 && (
        <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="yellow" paddingX={1}>
          {pathErrors.map(err => (
            <Text key={err} color="yellow">⚠ {err}</Text>
          ))}
        </Box>
      )}

      {state.config.exclude.length === 0 && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ No exclusions — node_modules will be scanned (slow)</Text>
        </Box>
      )}

      {!state.config.srcDir && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ Source directory is empty</Text>
        </Box>
      )}

      {!state.config.tsConfigPath && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ tsconfig path is empty</Text>
        </Box>
      )}

      <Box>
        {editingIndex !== null ? (
          <Text dimColor>Enter to confirm · Esc to cancel</Text>
        ) : (
          <Text dimColor>↑↓ navigate · Enter to edit · Esc ← back</Text>
        )}
      </Box>
    </Box>
  )
}
