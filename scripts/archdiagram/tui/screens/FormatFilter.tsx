import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { ScreenProps } from '../types.js'
import type { OutputFormat } from '../../types.js'

interface FormatOption {
  value: OutputFormat
  label: string
  hint?: string
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'excalidraw', label: 'excalidraw' },
  { value: 'mermaid', label: 'mermaid' },
  { value: 'svg', label: 'svg', hint: '(requires mermaid — auto-included if needed)' },
  { value: 'png', label: 'png', hint: '(requires mermaid — auto-included if needed)' },
  { value: 'canvas', label: 'canvas', hint: '(requires canvas on port 3444)' },
]

export function FormatFilter({ state, setState, setScreen }: ScreenProps): React.JSX.Element {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const totalItems = FORMAT_OPTIONS.length + 1

  const isSelected = (format: OutputFormat) => state.selectedFormats.includes(format)

  const toggleFormat = (format: OutputFormat) => {
    setState(s => {
      const next = s.selectedFormats.includes(format)
        ? s.selectedFormats.filter(f => f !== format)
        : [...s.selectedFormats, format]
      return { ...s, selectedFormats: next }
    })
    setErrorMessage(null)
  }

  useInput((input, key) => {
    if (key.escape) {
      setScreen('config')
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

    if (input === ' ') {
      if (focusedIndex < FORMAT_OPTIONS.length) {
        toggleFormat(FORMAT_OPTIONS[focusedIndex].value)
      }
      return
    }

    if (key.return) {
      if (focusedIndex === totalItems - 1) {
        if (state.selectedFormats.length === 0) {
          setErrorMessage('Select at least one format')
          return
        }
        setScreen('confirm')
        return
      }
      if (focusedIndex < FORMAT_OPTIONS.length) {
        toggleFormat(FORMAT_OPTIONS[focusedIndex].value)
      }
    }
  })

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Select Output Formats</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {FORMAT_OPTIONS.map((option, i) => {
          const isFocused = focusedIndex === i
          const checked = isSelected(option.value)
          return (
            <Box key={option.value}>
              <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
                {isFocused ? '❯ ' : '  '}
              </Text>
              <Text color={isFocused ? 'cyan' : checked ? 'green' : undefined}>
                {checked ? '[✓] ' : '[ ] '}
              </Text>
              <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
                {option.label}
              </Text>
              {option.hint && (
                <Text dimColor>  {option.hint}</Text>
              )}
            </Box>
          )
        })}

        <Box marginTop={1}>
          <Text
            color={focusedIndex === totalItems - 1 ? 'green' : 'gray'}
            bold={focusedIndex === totalItems - 1}
          >
            {focusedIndex === totalItems - 1 ? '❯ ' : '  '}
          </Text>
          <Text
            color={focusedIndex === totalItems - 1 ? 'green' : 'gray'}
            bold={focusedIndex === totalItems - 1}
          >
            → Next
          </Text>
        </Box>
      </Box>

      {errorMessage && (
        <Box marginBottom={1}>
          <Text color="red">⚠ {errorMessage}</Text>
        </Box>
      )}

      <Box>
        <Text dimColor>↑↓ navigate · Space/Enter toggle · Esc ← back</Text>
      </Box>
    </Box>
  )
}
