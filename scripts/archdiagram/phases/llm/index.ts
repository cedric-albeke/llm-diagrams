import type { LLMAdapter } from './types.js'
import type { LLMConfig } from '../../types.js'
import { AnthropicApiAdapter } from './anthropic-api-adapter.js'
import { ClaudeSubscriptionAdapter } from './claude-subscription-adapter.js'

const anthropicApiAdapter = new AnthropicApiAdapter()
const claudeSubscriptionAdapter = new ClaudeSubscriptionAdapter()

export function getLLMAdapter(config: LLMConfig): LLMAdapter {
  if (config.provider === 'anthropic') {
    return anthropicApiAdapter
  }

  if (config.provider === 'claude-subscription') {
    return claudeSubscriptionAdapter
  }

  throw new Error('LLM provider is none — cannot make API calls')
}
