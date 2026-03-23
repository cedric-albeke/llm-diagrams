import Anthropic from '@anthropic-ai/sdk'
import type { LLMAdapter, LLMRequest } from './types.js'

export class AnthropicApiAdapter implements LLMAdapter {
  async call(request: LLMRequest): Promise<string> {
    const apiKey = request.config.apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set')
    }

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: request.config.model ?? 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: request.config.temperature ?? 0.1,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.userPrompt }],
    })

    const content = response.content[0]
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    return content.text
  }
}
