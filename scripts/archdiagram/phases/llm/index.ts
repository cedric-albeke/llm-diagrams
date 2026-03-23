import type { LLMAdapter } from './types.js'
import type { LLMConfig } from '../../types.js'
import { AnthropicApiAdapter } from './anthropic-api-adapter.js'
import { ClaudeSubscriptionAdapter } from './claude-subscription-adapter.js'
import { OpenAICompatibleAdapter } from './openai-compatible-adapter.js'

const anthropicApiAdapter = new AnthropicApiAdapter()
const claudeSubscriptionAdapter = new ClaudeSubscriptionAdapter()
const openaiAdapter = new OpenAICompatibleAdapter('openai')
const openrouterAdapter = new OpenAICompatibleAdapter('openrouter')
const llmapiAdapter = new OpenAICompatibleAdapter('llmapi')

export function getLLMAdapter(config: LLMConfig): LLMAdapter {
  switch (config.provider) {
    case 'anthropic':
      return anthropicApiAdapter
    case 'claude-subscription':
      return claudeSubscriptionAdapter
    case 'openai':
      return openaiAdapter
    case 'openrouter':
      return openrouterAdapter
    case 'llmapi':
      return llmapiAdapter
    case 'none':
      throw new Error('LLM provider is none — cannot make API calls')
  }
}
