import React, { useEffect } from 'react'
import { render, Box, Text, useApp } from 'ink'

function App(): React.JSX.Element {
  const { exit } = useApp()

  useEffect(() => {
    exit()
  }, [exit])

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2}>
      <Text bold color="cyan">llm-diagrams TUI</Text>
      <Text dimColor> v0.1.0 — Architecture diagram generator</Text>
    </Box>
  )
}

render(<App />)
