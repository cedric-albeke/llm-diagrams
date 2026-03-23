import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '@inkjs/ui'
import type { ScreenProps } from '../types.js'
import type { PipelineProgressEvent } from '../../types.js'
import { runPipeline } from '../../index.js'

type PhaseStatus = 'waiting' | 'running' | 'complete' | 'error'

interface PhaseState {
  status: PhaseStatus
  duration?: number
  error?: string
}

const PHASES = ['analyze', 'reason', 'layout', 'render'] as const

function PhaseRow({ name, phase }: { name: string; phase: PhaseState }): React.JSX.Element {
  const { status, duration, error } = phase

  return (
    <Box>
      <Box width={12}>
        <Text color="white">{name}</Text>
      </Box>
      <Box width={4}>
        {status === 'waiting' && <Text dimColor>⬜</Text>}
        {status === 'running' && <Spinner type="dots" />}
        {status === 'complete' && <Text color="green">✓</Text>}
        {status === 'error' && <Text color="red">✗</Text>}
      </Box>
      <Box>
        {status === 'complete' && duration !== undefined && (
          <Text dimColor>{duration}ms</Text>
        )}
        {status === 'error' && error && (
          <Text color="red">{error}</Text>
        )}
        {status === 'running' && (
          <Text dimColor>running...</Text>
        )}
        {status === 'waiting' && (
          <Text dimColor>waiting</Text>
        )}
      </Box>
    </Box>
  )
}

export function Dashboard({ state, setState, setScreen }: ScreenProps): React.JSX.Element {
  const [phases, setPhases] = useState<Record<string, PhaseState>>({
    analyze: { status: 'waiting' },
    reason: { status: 'waiting' },
    layout: { status: 'waiting' },
    render: { status: 'waiting' },
  })
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const handleProgress = (event: PipelineProgressEvent) => {
      setPhases(prev => {
        let newStatus: PhaseStatus
        if (event.status === 'start') {
          newStatus = 'running'
        } else if (event.status === 'complete') {
          newStatus = 'complete'
        } else {
          newStatus = 'error'
        }

        return {
          ...prev,
          [event.phase]: {
            status: newStatus,
            duration: event.duration,
            error: event.status === 'error' ? event.message : undefined,
          },
        }
      })
    }

    runPipeline(state.config, {
      formats: state.selectedFormats,
      onProgress: handleProgress,
    })
      .then(result => {
        setState(s => ({ ...s, pipelineResult: result }))
        setDone(true)
        setTimeout(() => setScreen('results'), 1000)
      })
      .catch(err => {
        console.error(err)
        setFailed(true)
        setDone(true)
      })
  }, [])

  const allPhasesComplete = PHASES.every(
    p => phases[p]?.status === 'complete' || phases[p]?.status === 'error'
  )
  const hasError = PHASES.some(p => phases[p]?.status === 'error')

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        {!done && !allPhasesComplete && (
          <Text bold color="cyan">Running pipeline...</Text>
        )}
        {(done || allPhasesComplete) && !hasError && !failed && (
          <Text bold color="green">Complete ✓</Text>
        )}
        {(done || allPhasesComplete) && (hasError || failed) && (
          <Text bold color="red">Failed ✗</Text>
        )}
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} marginBottom={1}>
        {PHASES.map(name => (
          <PhaseRow key={name} name={name} phase={phases[name]} />
        ))}
      </Box>

      {done && (
        <Box>
          <Text dimColor>Press any key to continue...</Text>
        </Box>
      )}
    </Box>
  )
}
