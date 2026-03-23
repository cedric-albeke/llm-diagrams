import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import type { LLMAdapter, LLMRequest } from './types.js'

function hasCredentialFile(): boolean {
  try {
    const credPath = path.join(homedir(), '.claude', '.credentials.json')
    const raw = readFileSync(credPath, 'utf-8')
    const parsed = JSON.parse(raw) as {
      claudeAiOauth?: Record<string, unknown>
      accessToken?: unknown
    }
    const oauth = parsed.claudeAiOauth ?? parsed
    return typeof oauth.accessToken === 'string' && oauth.accessToken.length > 0
  } catch {
    return false
  }
}

export function hasClaudeSubscriptionCredentialSource(): boolean {
  const envToken = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.CLAUDE_CODE_OAUTH_TOKEN
  if (typeof envToken === 'string' && envToken.length > 0) {
    return true
  }
  return hasCredentialFile()
}

export class ClaudeSubscriptionAdapter implements LLMAdapter {
  async call(request: LLMRequest): Promise<string> {
    const prompt = `SYSTEM INSTRUCTIONS:\n${request.systemPrompt}\n\nUSER REQUEST:\n${request.userPrompt}`
    const args = ['-p', prompt, '--output-format', 'text']

    if (request.config.model) {
      args.push('--model', request.config.model)
    }

    try {
      const stdout = execFileSync('claude', args, {
        encoding: 'utf-8',
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, TERM: 'dumb' },
      })

      const output = stdout.trim()
      if (!output) {
        throw new Error('Claude CLI returned empty output')
      }

      return output
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Claude subscription execution failed: ${message}`)
    }
  }
}
