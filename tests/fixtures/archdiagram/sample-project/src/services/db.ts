export interface QueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
}

export class DatabaseClient {
  async findOne(table: string, id: string): Promise<Record<string, unknown> | null> {
    // Stub implementation
    return null
  }

  async delete(table: string, id: string): Promise<void> {
    // Stub implementation
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    return { rows: [], rowCount: 0 }
  }
}
