import type { LLMConfig } from '../../types.js'

export interface LLMRequest {
  systemPrompt: string
  userPrompt: string
  config: LLMConfig
}

export interface LLMAdapter {
  call(request: LLMRequest): Promise<string>
}
