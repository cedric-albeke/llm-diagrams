import React from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { useScreen } from './hooks/useScreen.js'
import { Welcome } from './screens/Welcome.js'
import { ProviderSelect } from './screens/ProviderSelect.js'
import { ConfigEditor } from './screens/ConfigEditor.js'
import { FormatFilter } from './screens/FormatFilter.js'
import { Confirm } from './screens/Confirm.js'
import { Dashboard } from './screens/Dashboard.js'
import { Results } from './screens/Results.js'

export function App(): React.JSX.Element {
  const { exit } = useApp()
  const { screen, setScreen, tuiState, setTuiState } = useScreen()

  const screenProps = { state: tuiState, setState: setTuiState, setScreen }

  useInput((input) => {
    if (input === 'q' && screen !== 'dashboard') {
      exit()
    }
  })

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">llm-diagrams</Text>
        <Text dimColor> — Architecture Diagram Generator</Text>
      </Box>

      {screen === 'welcome' && <Welcome {...screenProps} />}
      {screen === 'provider' && <ProviderSelect {...screenProps} />}
      {screen === 'config' && <ConfigEditor {...screenProps} />}
      {screen === 'formats' && <FormatFilter {...screenProps} />}
      {screen === 'confirm' && <Confirm {...screenProps} />}
      {screen === 'dashboard' && <Dashboard {...screenProps} />}
      {screen === 'results' && <Results {...screenProps} />}
    </Box>
  )
}
