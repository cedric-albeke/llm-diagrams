import { useState, useCallback } from 'react'
import type { TuiScreen, TuiState } from '../types.js'
import type { ArchDiagramConfig } from '../../types.js'
import { DEFAULT_CONFIG } from '../../config.js'

export interface UseScreenReturn {
  screen: TuiScreen
  setScreen: (screen: TuiScreen) => void
  tuiState: TuiState
  setTuiState: (updater: (s: TuiState) => TuiState) => void
}

const INITIAL_STATE: TuiState = {
  screen: 'welcome',
  config: DEFAULT_CONFIG,
  selectedFormats: ['excalidraw', 'mermaid'],
  dryRun: false,
}

export function useScreen(initialState?: Partial<TuiState>): UseScreenReturn {
  const [tuiState, setTuiState] = useState<TuiState>({
    ...INITIAL_STATE,
    ...initialState,
  })

  const setScreen = useCallback((screen: TuiScreen) => {
    setTuiState(s => ({ ...s, screen }))
  }, [])

  return {
    screen: tuiState.screen,
    setScreen,
    tuiState,
    setTuiState,
  }
}
