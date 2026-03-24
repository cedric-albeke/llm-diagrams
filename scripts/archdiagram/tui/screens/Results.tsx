import React, { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import fs from 'fs'
import type { ScreenProps } from '../types.js'
import { saveConfig } from '../../config-serializer.js'

export function Results({ state }: ScreenProps): React.JSX.Element {
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { pipelineResult, errorMessage } = state

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
      try {
        saveConfig(state.config, 'archdiagram.config.ts')
        setSaved(true)
      } catch (err) {
        setSaveError((err as Error)?.message ?? 'Failed to save config')
      }
    }
  })

  const phases = pipelineResult?.phases ?? []
  const successOutputs = pipelineResult?.outputs.filter(o => o.success) ?? []

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1} flexDirection="column">
        {anyError ? (
          <Text bold color="red">Generation Failed ✗</Text>
        ) : (
          <Text bold color="green">Generation Complete ✓</Text>
        )}
        {errorMessage && (
          <Text color="red">{errorMessage}</Text>
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
        ) : saveError ? (
          <Text color="red">⚠ Save failed: {saveError}</Text>
        ) : (
          <Text dimColor>Save these settings to archdiagram.config.ts? (y/n)</Text>
        )}
      </Box>

      <Text bold>Press q to exit</Text>
    </Box>
  )
}
