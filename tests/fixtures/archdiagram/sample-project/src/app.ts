'use client'

import type { AuthService } from './services/auth.js'
import type { DatabaseClient } from './services/db.js'
import { createLogger } from './utils/logger.js'

const logger = createLogger('app')

export interface AppConfig {
  port: number
  debug: boolean
}

export function createApp(auth: AuthService, db: DatabaseClient, config: AppConfig): void {
  logger.log(`Starting app on port ${config.port}`)
}
