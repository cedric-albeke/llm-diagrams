export interface Logger {
  log(message: string): void
  warn(message: string): void
  error(message: string): void
}

export function createLogger(namespace: string): Logger {
  return {
    log: (msg) => console.log(`[${namespace}] ${msg}`),
    warn: (msg) => console.warn(`[${namespace}] WARN: ${msg}`),
    error: (msg) => console.error(`[${namespace}] ERROR: ${msg}`),
  }
}
