import React from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import type { TuiScreen, TuiState } from './types.js'
import { useScreen } from './hooks/useScreen.js'

export function App(): React.JSX.Element {
  const { exit } = useApp()
  const { screen, setScreen, tuiState, setTuiState } = useScreen()

  useInput((input, key) => {
    if ((input === 'q' || key.escape) && screen !== 'dashboard' && screen !== 'results') {
      exit()
    }
  })

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">llm-diagrams</Text>
        <Text dimColor> — Architecture Diagram Generator</Text>
      </Box>

      {screen === 'welcome' && (
        <Text>Welcome — press Enter to start, q to quit</Text>
      )}
      {screen === 'provider' && (
        <Text>Provider selection (coming soon)</Text>
      )}
      {screen === 'config' && (
        <Text>Config editor (coming soon)</Text>
      )}
      {screen === 'formats' && (
        <Text>Format selector (coming soon)</Text>
      )}
      {screen === 'confirm' && (
        <Text>Confirm (coming soon)</Text>
      )}
      {screen === 'dashboard' && (
        <Text>Dashboard (coming soon)</Text>
      )}
      {screen === 'results' && (
        <Text>Results (coming soon)</Text>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          {screen !== 'dashboard' && screen !== 'results' ? 'q: quit' : ''}
        </Text>
      </Box>
    </Box>
  )
}
