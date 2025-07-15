import sql from 'mssql'

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
    server: process.env.SQL_SERVER || 'localhost',
    database: process.env.SQL_DATABASE || 'master',
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: parseInt(process.env.SQL_PORT || '1433'),
    pool: {
      min: 5,
      max: 50,
      idleTimeoutMillis: 1000 * 60 * 5,
      acquireTimeoutMillis: 1000 * 10,
    },
    options: {
      enableArithAbort: true,
      trustServerCertificate: process.env.SQL_TRUST_CERT === 'true',
      encrypt: process.env.SQL_ENCRYPT === 'true',
      appName: 'sqlserver-mcp',
    },
  }
}
