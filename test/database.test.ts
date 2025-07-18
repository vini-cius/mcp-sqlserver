jest.mock('../src/env', () => ({
  env: {
    SQL_SERVER: 'localhost',
    SQL_DATABASE: 'master',
    SQL_USER: 'test-user',
    SQL_PASSWORD: 'test-password',
    SQL_PORT: 1433,
    SQL_TRUST_CERT: false,
    SQL_ENCRYPT: false,
  }
}))

import sql from 'mssql'

import { createDatabaseConfig, DatabaseConnection } from '../src/database'

jest.mock('mssql')

describe('DatabaseConnection', () => {
  let mockPool: jest.Mocked<sql.ConnectionPool>
  let mockRequest: jest.Mocked<sql.Request>
  let config: sql.config
  let dbConnection: DatabaseConnection

  beforeEach(() => {
    mockRequest = {
      query: jest.fn(),
    } as unknown as jest.Mocked<sql.Request>

    mockPool = {
      connect: jest.fn(),
      close: jest.fn(),
      request: jest.fn().mockReturnValue(mockRequest),
    } as unknown as jest.Mocked<sql.ConnectionPool>

    Object.defineProperty(mockPool, 'connected', {
      get: jest.fn(() => true),
      configurable: true,
    })

    Object.defineProperty(mockPool, 'size', {
      get: jest.fn(() => 5),
      configurable: true,
    })
      ; (
        sql.ConnectionPool as jest.MockedClass<typeof sql.ConnectionPool>
      ).mockImplementation(() => mockPool)

    config = {
      server: 'test-server',
      database: 'test-db',
      user: 'test-user',
      password: 'test-password',
      port: 1433,
    }

    dbConnection = new DatabaseConnection(config)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('connect', () => {
    it('should create new pool and connect successfully', async () => {
      Object.defineProperty(mockPool, 'connected', {
        get: jest.fn(() => false),
        configurable: true,
      })

      await dbConnection.connect()

      expect(sql.ConnectionPool).toHaveBeenCalledWith(config)
      expect(mockPool.connect).toHaveBeenCalledTimes(1)
    })

    it('should not create new connection if already connected', async () => {
      Object.defineProperty(mockPool, 'connected', {
        get: jest.fn(() => true),
        configurable: true,
      })

      await dbConnection.connect()
      await dbConnection.connect()

      expect(sql.ConnectionPool).toHaveBeenCalledTimes(1)
      expect(mockPool.connect).toHaveBeenCalledTimes(1)
    })

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed')
        ; (mockPool.connect as jest.Mock).mockRejectedValue(connectionError)

      await expect(dbConnection.connect()).rejects.toThrow('Connection failed')
    })
  })

  describe('disconnect', () => {
    it('should close pool and set to null', async () => {
      await dbConnection.connect()
      await dbConnection.disconnect()

      expect(mockPool.close).toHaveBeenCalledTimes(1)
      expect(dbConnection.isConnected()).toBe(false)
    })

    it('should handle disconnect when pool is null', async () => {
      await dbConnection.disconnect()

      expect(mockPool.close).not.toHaveBeenCalled()
    })

    it('should handle close errors', async () => {
      await dbConnection.connect()
      const closeError = new Error('Close failed')
        ; (mockPool.close as jest.Mock).mockRejectedValue(closeError)

      await expect(dbConnection.disconnect()).rejects.toThrow('Close failed')
    })
  })

  describe('getPool', () => {
    it('should return pool when connected', async () => {
      await dbConnection.connect()
      const pool = dbConnection.getPool()

      expect(pool).toBe(mockPool)
    })

    it('should throw error when pool is not initialized', () => {
      expect(() => dbConnection.getPool()).toThrow(
        'Database connection not initialized'
      )
    })
  })

  describe('isConnected', () => {
    it('should return true when pool is connected', async () => {
      await dbConnection.connect()
      Object.defineProperty(mockPool, 'connected', {
        get: jest.fn(() => true),
        configurable: true,
      })

      expect(dbConnection.isConnected()).toBe(true)
    })

    it('should return false when pool is not connected', async () => {
      await dbConnection.connect()
      Object.defineProperty(mockPool, 'connected', {
        get: jest.fn(() => false),
        configurable: true,
      })

      expect(dbConnection.isConnected()).toBe(false)
    })

    it('should return false when pool is null', () => {
      expect(dbConnection.isConnected()).toBe(false)
    })
  })

  describe('healthCheck', () => {
    beforeEach(async () => {
      await dbConnection.connect()
    })

    it('should return health status successfully', async () => {
      const mockResult = {
        recordset: [{ health: 1 }],
      }
        ; (mockRequest.query as jest.Mock).mockResolvedValue(mockResult)

      Object.defineProperty(mockPool, 'size', {
        get: jest.fn(() => 10),
        configurable: true,
      })

      const result = await dbConnection.healthCheck()

      expect(mockRequest.query).toHaveBeenCalledWith('SELECT 1 as health')
      expect(result).toEqual({
        status: 'healthy',
        database: config.database,
        timestamp: expect.any(String),
        connections: 10,
        result: [{ health: 1 }],
      })
    })

    it('should throw error when pool is not initialized', async () => {
      await dbConnection.disconnect()

      await expect(dbConnection.healthCheck()).rejects.toThrow(
        'Pool not initialized'
      )
    })

    it('should handle query errors', async () => {
      const queryError = new Error('Query failed')
        ; (mockRequest.query as jest.Mock).mockRejectedValue(queryError)

      await expect(dbConnection.healthCheck()).rejects.toThrow('Query failed')
    })
  })
})

describe('createDatabaseConfig', () => {
  it('should create config with current mock values', () => {
    const config = createDatabaseConfig()

    expect(config).toEqual({
      server: 'localhost',
      database: 'master',
      user: 'test-user',
      password: 'test-password',
      port: 1433,
      pool: {
        min: 5,
        max: 50,
        idleTimeoutMillis: 300000,
        acquireTimeoutMillis: 10000,
      },
      options: {
        enableArithAbort: true,
        trustServerCertificate: false,
        encrypt: false,
        appName: 'sqlserver-mcp',
      },
    })
  })

  it('should handle boolean options correctly', () => {
    const config = createDatabaseConfig()

    expect(config.options?.trustServerCertificate).toBe(false)
    expect(config.options?.encrypt).toBe(false)
  })
})
