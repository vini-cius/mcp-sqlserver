import type { DatabaseConnection } from '../../src/database'
import { getDatabaseInfo } from '../../src/tools/get-database-info'

// Type definitions for MSSQL mocks
interface MockRequest {
  query: jest.MockedFunction<
    (query: string) => Promise<{ recordset: Array<Record<string, unknown>> }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('getDatabaseInfo', () => {
  let mockDb: jest.Mocked<DatabaseConnection>
  let mockPool: MockPool
  let mockRequest: MockRequest

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock request
    mockRequest = {
      query: jest.fn(),
    }

    // Mock pool
    mockPool = {
      request: jest.fn().mockReturnValue(mockRequest),
    }

    // Mock DatabaseConnection
    mockDb = {
      getPool: jest.fn().mockReturnValue(mockPool),
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(),
      healthCheck: jest.fn(),
      pool: {} as unknown,
      config: {} as unknown,
    } as unknown as jest.Mocked<DatabaseConnection>
  })

  describe('successful execution', () => {
    it('should retrieve complete database information', async () => {
      const mockResults = [
        { recordset: [{ DatabaseName: 'TestDB' }] },
        { recordset: [{ ServerVersion: 'Microsoft SQL Server 2019' }] },
        { recordset: [{ Edition: 'Developer Edition' }] },
        { recordset: [{ ProductLevel: 'RTM' }] },
      ]

      mockRequest.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3])

      const result = await getDatabaseInfo(mockDb)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(4)
      expect(mockRequest.query).toHaveBeenCalledTimes(4)

      // Verify query calls
      expect(mockRequest.query).toHaveBeenNthCalledWith(
        1,
        'SELECT DB_NAME() as DatabaseName'
      )
      expect(mockRequest.query).toHaveBeenNthCalledWith(
        2,
        'SELECT @@VERSION as ServerVersion'
      )
      expect(mockRequest.query).toHaveBeenNthCalledWith(
        3,
        "SELECT SERVERPROPERTY('Edition') as Edition"
      )
      expect(mockRequest.query).toHaveBeenNthCalledWith(
        4,
        "SELECT SERVERPROPERTY('ProductLevel') as ProductLevel"
      )

      const expectedInfo = {
        database: 'TestDB',
        version: 'Microsoft SQL Server 2019',
        edition: 'Developer Edition',
        productLevel: 'RTM',
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedInfo, null, 2),
          },
        ],
      })
    })

    it('should handle missing values in recordset', async () => {
      const mockResults = [
        { recordset: [{}] }, // Empty object
        { recordset: [{ ServerVersion: 'Microsoft SQL Server 2019' }] },
        { recordset: [{}] }, // Empty object
        { recordset: [{ ProductLevel: 'RTM' }] },
      ]

      mockRequest.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3])

      const result = await getDatabaseInfo(mockDb)

      const expectedInfo = {
        database: undefined,
        version: 'Microsoft SQL Server 2019',
        edition: undefined,
        productLevel: 'RTM',
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedInfo, null, 2),
          },
        ],
      })
    })

    it('should handle empty recordsets', async () => {
      const mockResults = [
        { recordset: [] },
        { recordset: [] },
        { recordset: [] },
        { recordset: [] },
      ]

      mockRequest.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3])

      const result = await getDatabaseInfo(mockDb)

      const expectedInfo = {
        database: undefined,
        version: undefined,
        edition: undefined,
        productLevel: undefined,
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedInfo, null, 2),
          },
        ],
      })
    })

    it('should handle SQL Server Express edition', async () => {
      const mockResults = [
        { recordset: [{ DatabaseName: 'ExpressDB' }] },
        { recordset: [{ ServerVersion: 'Microsoft SQL Server 2019 Express' }] },
        { recordset: [{ Edition: 'Express Edition' }] },
        { recordset: [{ ProductLevel: 'CU1' }] },
      ]

      mockRequest.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3])

      const result = await getDatabaseInfo(mockDb)

      const expectedInfo = {
        database: 'ExpressDB',
        version: 'Microsoft SQL Server 2019 Express',
        edition: 'Express Edition',
        productLevel: 'CU1',
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedInfo, null, 2),
          },
        ],
      })
    })
  })

  describe('error handling', () => {
    it('should handle connection pool error', async () => {
      mockDb.getPool.mockImplementation(() => {
        throw new Error('Failed to get connection pool')
      })

      const result = await getDatabaseInfo(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Failed to get connection pool',
          },
        ],
        isError: true,
      })
    })

    it('should handle query execution error', async () => {
      mockRequest.query.mockRejectedValue(new Error('Query execution failed'))

      const result = await getDatabaseInfo(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Query execution failed',
          },
        ],
        isError: true,
      })
    })

    it('should handle partial query failure', async () => {
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [{ DatabaseName: 'TestDB' }] })
        .mockRejectedValueOnce(new Error('Version query failed'))

      const result = await getDatabaseInfo(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Version query failed',
          },
        ],
        isError: true,
      })
    })

    it('should handle unknown error type', async () => {
      mockRequest.query.mockRejectedValue('Unknown error string')

      const result = await getDatabaseInfo(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Erro desconhecido',
          },
        ],
        isError: true,
      })
    })

    it('should handle request creation error', async () => {
      mockPool.request.mockImplementation(() => {
        throw new Error('Failed to create request')
      })

      const result = await getDatabaseInfo(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Failed to create request',
          },
        ],
        isError: true,
      })
    })
  })

  describe('concurrent execution', () => {
    it('should execute all queries concurrently', async () => {
      const mockResults = [
        { recordset: [{ DatabaseName: 'TestDB' }] },
        { recordset: [{ ServerVersion: 'Microsoft SQL Server 2019' }] },
        { recordset: [{ Edition: 'Standard Edition' }] },
        { recordset: [{ ProductLevel: 'SP1' }] },
      ]

      // Add delay to simulate async execution
      let queryCount = 0
      mockRequest.query.mockImplementation(async () => {
        const currentQuery = queryCount++
        // Simulate different execution times
        await new Promise((resolve) =>
          setTimeout(resolve, (4 - currentQuery) * 10)
        )
        return mockResults[currentQuery]
      })

      const startTime = Date.now()
      await getDatabaseInfo(mockDb)
      const executionTime = Date.now() - startTime

      // Should complete faster than sequential execution (which would take ~100ms)
      expect(executionTime).toBeLessThan(100)
      expect(mockRequest.query).toHaveBeenCalledTimes(4)
      expect(mockPool.request).toHaveBeenCalledTimes(4)
    })

    it('should create separate request instances for each query', async () => {
      const mockRequest1 = {
        query: jest
          .fn()
          .mockResolvedValue({ recordset: [{ DatabaseName: 'TestDB' }] }),
      }
      const mockRequest2 = {
        query: jest
          .fn()
          .mockResolvedValue({ recordset: [{ ServerVersion: 'SQL Server' }] }),
      }
      const mockRequest3 = {
        query: jest
          .fn()
          .mockResolvedValue({ recordset: [{ Edition: 'Standard' }] }),
      }
      const mockRequest4 = {
        query: jest
          .fn()
          .mockResolvedValue({ recordset: [{ ProductLevel: 'RTM' }] }),
      }

      mockPool.request
        .mockReturnValueOnce(mockRequest1 as unknown as MockRequest)
        .mockReturnValueOnce(mockRequest2 as unknown as MockRequest)
        .mockReturnValueOnce(mockRequest3 as unknown as MockRequest)
        .mockReturnValueOnce(mockRequest4 as unknown as MockRequest)

      await getDatabaseInfo(mockDb)

      expect(mockPool.request).toHaveBeenCalledTimes(4)
      expect(mockRequest1.query).toHaveBeenCalledTimes(1)
      expect(mockRequest2.query).toHaveBeenCalledTimes(1)
      expect(mockRequest3.query).toHaveBeenCalledTimes(1)
      expect(mockRequest4.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('data type handling', () => {
    it('should handle various data types in recordset', async () => {
      const mockResults = [
        { recordset: [{ DatabaseName: 'TestDB' }] },
        {
          recordset: [
            { ServerVersion: 'Microsoft SQL Server 2019 (RTM) - 15.0.2000.5' },
          ],
        },
        { recordset: [{ Edition: 'Developer Edition (64-bit)' }] },
        { recordset: [{ ProductLevel: 'RTM' }] },
      ]

      mockRequest.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3])

      const result = await getDatabaseInfo(mockDb)

      const resultData = JSON.parse(result.content[0].text as string)

      expect(typeof resultData.database).toBe('string')
      expect(typeof resultData.version).toBe('string')
      expect(typeof resultData.edition).toBe('string')
      expect(typeof resultData.productLevel).toBe('string')

      expect(resultData.database).toBe('TestDB')
      expect(resultData.version).toContain('Microsoft SQL Server 2019')
      expect(resultData.edition).toContain('Developer Edition')
      expect(resultData.productLevel).toBe('RTM')
    })
  })
})
