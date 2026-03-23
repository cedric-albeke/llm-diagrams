import type { ArchDiagramConfig, OutputFormat, PipelineResult } from '../types.js'

export type TuiScreen =
  | 'welcome'
  | 'provider'
  | 'config'
  | 'formats'
  | 'confirm'
  | 'dashboard'
  | 'results'

export interface TuiState {
  screen: TuiScreen
  config: ArchDiagramConfig
  selectedFormats: OutputFormat[]
  pipelineResult?: PipelineResult
  errorMessage?: string
}

export interface ScreenProps {
  state: TuiState
  setState: (updater: (s: TuiState) => TuiState) => void
  setScreen: (screen: TuiScreen) => void
}
