import sql from 'mssql'

import { env } from './env'

export class DatabaseConnection {
  private pool: sql.ConnectionPool | null = null
  private config: sql.config

  constructor(config: sql.config) {
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.pool && this.pool.connected) return

    this.pool = new sql.ConnectionPool(this.config)

    await this.pool.connect()
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close()

      this.pool = null
    }
  }

  getPool(): sql.ConnectionPool {
    if (!this.pool) {
      throw new Error('Database connection not initialized')
    }

    return this.pool
  }

  isConnected(): boolean {
    return this.pool?.connected ?? false
  }

  async healthCheck() {
    if (!this.pool) {
      throw new Error('Pool not initialized')
    }

    const request = this.pool.request()
    const result = await request.query('SELECT 1 as health')

    return {
      status: 'healthy',
      database: this.config.database,
      timestamp: new Date().toISOString(),
      connections: this.pool.size,
      result: result.recordset,
    }
  }
}

export function createDatabaseConfig(): sql.config {
  return {
    server: env.SQL_SERVER || 'localhost',
    database: env.SQL_DATABASE || 'master',
    user: env.SQL_USER,
    password: env.SQL_PASSWORD,
    port: env.SQL_PORT,
    pool: {
      min: 5,
      max: 50,
      idleTimeoutMillis: 1000 * 60 * 5,
      acquireTimeoutMillis: 1000 * 10,
    },
    options: {
      enableArithAbort: true,
      trustServerCertificate: env.SQL_TRUST_CERT,
      encrypt: env.SQL_ENCRYPT,
      appName: 'sqlserver-mcp',
    },
  }
}
