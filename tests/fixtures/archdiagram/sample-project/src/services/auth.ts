import type { DatabaseClient } from './db.js'

export interface AuthToken {
  userId: string
  expiresAt: number
}

export class AuthService {
  constructor(private readonly db: DatabaseClient) {}

  async authenticate(token: string): Promise<AuthToken | null> {
    const record = await this.db.findOne('tokens', token)
    if (!record) return null
    return record as unknown as AuthToken
  }

  async revokeToken(token: string): Promise<void> {
    await this.db.delete('tokens', token)
  }
}
