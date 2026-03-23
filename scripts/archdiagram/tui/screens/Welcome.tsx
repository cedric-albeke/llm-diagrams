import React from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import type { ScreenProps } from '../types.js'

export function Welcome({ setScreen }: ScreenProps): React.JSX.Element {
  const { exit } = useApp()

  useInput((input, key) => {
    if (key.return) {
      setScreen('provider')
    }
    if (input === 'q' || key.escape) {
      exit()
    }
  })

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="cyan">llm-diagrams</Text>
          <Text color="white">  v0.1.0</Text>
        </Box>
        <Text dimColor>Architecture Diagram Generator for TypeScript codebases</Text>
        <Text bold>Welcome</Text>
      </Box>

      <Box flexDirection="column" marginBottom={2} paddingLeft={1} borderStyle="single" borderColor="gray" paddingY={0} paddingRight={2}>
        <Text>Analyze your source code, group modules with LLM reasoning,</Text>
        <Text>compute layouts, and render publication-quality diagrams.</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Keyboard shortcuts:</Text>
        <Box marginTop={1} flexDirection="column" gap={0}>
          <Box>
            <Box width={14}>
              <Text color="cyan" bold>  [Enter]</Text>
            </Box>
            <Text>  Start — select provider and configure</Text>
          </Box>
          <Box>
            <Box width={14}>
              <Text color="yellow" bold>  [q]</Text>
            </Box>
            <Text>  Quit</Text>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>press Enter to start, q to quit</Text>
      </Box>
    </Box>
  )
}
