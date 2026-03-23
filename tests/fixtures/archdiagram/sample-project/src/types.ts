export type Environment = 'development' | 'production' | 'test'

export interface ServerConfig {
  host: string
  port: number
  env: Environment
}
