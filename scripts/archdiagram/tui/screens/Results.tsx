import React, { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import fs from 'fs'
import type { ScreenProps } from '../types.js'
import { saveConfig } from '../../config-serializer.js'

export function Results({ state }: ScreenProps): React.JSX.Element {
  const [saved, setSaved] = useState(false)
  const { pipelineResult } = state

  const anyError = pipelineResult?.phases.some(p => !p.success) ?? false

  const mermaidPreview = useMemo(() => {
    const mermaidResult = pipelineResult?.outputs.find(o => o.format === 'mermaid' && o.success)
    if (!mermaidResult) return null
    try {
      const content = fs.readFileSync(mermaidResult.filePath, 'utf-8')
      return content.split('\n').slice(0, 20).join('\n')
    } catch {
      return null
    }
  }, [pipelineResult])

  useInput((input) => {
    if (input === 'y' && !saved) {
      saveConfig(state.config, 'archdiagram.config.ts')
      setSaved(true)
    }
  })

  const phases = pipelineResult?.phases ?? []
  const successOutputs = pipelineResult?.outputs.filter(o => o.success) ?? []

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        {anyError ? (
          <Text bold color="red">Generation Failed ✗</Text>
        ) : (
          <Text bold color="green">Generation Complete ✓</Text>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold dimColor>Phase Summary</Text>
        {phases.map(phase => (
          <Box key={phase.phase}>
            <Box width={12}>
              <Text>{phase.phase}</Text>
            </Box>
            <Text color={phase.success ? 'green' : 'red'}>{phase.success ? '✓' : '✗'}</Text>
            <Text dimColor>  {phase.duration}ms</Text>
          </Box>
        ))}
      </Box>

      {successOutputs.length > 0 && (
        <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold dimColor>Output Files</Text>
          {successOutputs.map(output => (
            <Box key={output.filePath}>
              <Box width={14}>
                <Text color="cyan">{output.format}</Text>
              </Box>
              <Text dimColor>{output.filePath}</Text>
            </Box>
          ))}
        </Box>
      )}

      {mermaidPreview && (
        <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text bold color="yellow">Mermaid Diagram Preview</Text>
          <Text>{mermaidPreview}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        {saved ? (
          <Text color="green">Saved ✓</Text>
        ) : (
          <Text dimColor>Save these settings to archdiagram.config.ts? (y/n)</Text>
        )}
      </Box>

      <Text dimColor>Press q to exit</Text>
    </Box>
  )
}
