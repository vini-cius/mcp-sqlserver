import type { DatabaseConnection } from '../../src/database'
import { listTables } from '../../src/tools/list-tables'

interface MockRequest {
  input: jest.MockedFunction<(name: string, value: unknown) => MockRequest>
  query: jest.MockedFunction<
    (query: string) => Promise<{ recordset: unknown[] }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('listTables', () => {
  let mockDb: jest.Mocked<DatabaseConnection>
  let mockPool: MockPool
  let mockRequest: MockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      input: jest.fn().mockReturnThis(),
      query: jest.fn(),
    }

    mockPool = {
      request: jest.fn().mockReturnValue(mockRequest),
    }

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
    it('should list all tables without schema filter', async () => {
      const mockResult = {
        recordset: [
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'Users',
            TABLE_TYPE: 'BASE TABLE',
          },
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'Orders',
            TABLE_TYPE: 'BASE TABLE',
          },
          {
            TABLE_SCHEMA: 'sales',
            TABLE_NAME: 'Products',
            TABLE_TYPE: 'BASE TABLE',
          },
          {
            TABLE_SCHEMA: 'inventory',
            TABLE_NAME: 'Stock',
            TABLE_TYPE: 'BASE TABLE',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).not.toHaveBeenCalled()
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("TABLE_TYPE = 'BASE TABLE'")
      expect(queryCall).toContain('ORDER BY TABLE_SCHEMA, TABLE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                tables: mockResult.recordset,
                count: mockResult.recordset.length,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should list tables with schema filter', async () => {
      const schemaName = 'dbo'
      const mockResult = {
        recordset: [
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'Users',
            TABLE_TYPE: 'BASE TABLE',
          },
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'Orders',
            TABLE_TYPE: 'BASE TABLE',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb, schemaName)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("TABLE_TYPE = 'BASE TABLE'")
      expect(queryCall).toContain('AND TABLE_SCHEMA = @schemaName')
      expect(queryCall).toContain('ORDER BY TABLE_SCHEMA, TABLE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                tables: mockResult.recordset,
                count: mockResult.recordset.length,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should handle empty result set', async () => {
      const mockResult = {
        recordset: [],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                tables: [],
                count: 0,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should handle custom schema with no tables', async () => {
      const schemaName = 'nonexistent'
      const mockResult = {
        recordset: [],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
      expect(result.content[0].text).toContain('"tables": []')
      expect(result.content[0].text).toContain('"count": 0')
    })

    it('should handle multiple schemas', async () => {
      const mockResult = {
        recordset: [
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'Users',
            TABLE_TYPE: 'BASE TABLE',
          },
          {
            TABLE_SCHEMA: 'sales',
            TABLE_NAME: 'Orders',
            TABLE_TYPE: 'BASE TABLE',
          },
          {
            TABLE_SCHEMA: 'inventory',
            TABLE_NAME: 'Products',
            TABLE_TYPE: 'BASE TABLE',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb)

      expect(result.content[0].text).toContain('"tables":')
      expect(result.content[0].text).toContain('"count": 3')

      const parsedResult = JSON.parse(result.content[0].text as string)
      expect(parsedResult.tables).toHaveLength(3)
      expect(parsedResult.tables[0].TABLE_SCHEMA).toBe('dbo')
      expect(parsedResult.tables[1].TABLE_SCHEMA).toBe('sales')
      expect(parsedResult.tables[2].TABLE_SCHEMA).toBe('inventory')
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')

      mockRequest.query.mockRejectedValue(error)

      const result = await listTables(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Database connection failed',
          },
        ],
        isError: true,
      })
    })

    it('should handle unknown errors', async () => {
      const error = 'Unknown database error'

      mockRequest.query.mockRejectedValue(error)

      const result = await listTables(mockDb)

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

    it('should handle pool request errors', async () => {
      const error = new Error('Pool request failed')

      mockPool.request.mockImplementation(() => {
        throw error
      })

      const result = await listTables(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Pool request failed',
          },
        ],
        isError: true,
      })
    })
  })

  describe('query structure', () => {
    it('should build correct query without schema filter', async () => {
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listTables(mockDb)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain('TABLE_SCHEMA')
      expect(queryCall).toContain('TABLE_NAME')
      expect(queryCall).toContain('TABLE_TYPE')
      expect(queryCall).toContain('FROM INFORMATION_SCHEMA.TABLES')
      expect(queryCall).toContain("WHERE TABLE_TYPE = 'BASE TABLE'")
      expect(queryCall).toContain('ORDER BY TABLE_SCHEMA, TABLE_NAME')
      expect(queryCall).not.toContain('@schemaName')
    })

    it('should build correct query with schema filter', async () => {
      const schemaName = 'test'
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listTables(mockDb, schemaName)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('AND TABLE_SCHEMA = @schemaName')
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
    })

    it('should exclude views from results', async () => {
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listTables(mockDb)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain("WHERE TABLE_TYPE = 'BASE TABLE'")
      expect(queryCall).not.toContain("TABLE_TYPE = 'VIEW'")
    })
  })

  describe('result format', () => {
    it('should return tables in correct format', async () => {
      const mockResult = {
        recordset: [
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'TestTable',
            TABLE_TYPE: 'BASE TABLE',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult).toHaveProperty('tables')
      expect(parsedResult).toHaveProperty('count')
      expect(parsedResult.tables).toEqual(mockResult.recordset)
      expect(parsedResult.count).toBe(mockResult.recordset.length)
    })

    it('should include all required table properties', async () => {
      const mockResult = {
        recordset: [
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'Users',
            TABLE_TYPE: 'BASE TABLE',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult.tables[0]).toHaveProperty('TABLE_SCHEMA')
      expect(parsedResult.tables[0]).toHaveProperty('TABLE_NAME')
      expect(parsedResult.tables[0]).toHaveProperty('TABLE_TYPE')
      expect(parsedResult.tables[0].TABLE_SCHEMA).toBe('dbo')
      expect(parsedResult.tables[0].TABLE_NAME).toBe('Users')
      expect(parsedResult.tables[0].TABLE_TYPE).toBe('BASE TABLE')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in table names', async () => {
      const mockResult = {
        recordset: [
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'User_Data_2024',
            TABLE_TYPE: 'BASE TABLE',
          },
          {
            TABLE_SCHEMA: 'dbo',
            TABLE_NAME: 'Order-Details',
            TABLE_TYPE: 'BASE TABLE',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult.tables).toHaveLength(2)
      expect(parsedResult.count).toBe(2)
    })

    it('should handle large number of tables', async () => {
      const mockResult = {
        recordset: Array.from({ length: 100 }, (_, i) => ({
          TABLE_SCHEMA: 'dbo',
          TABLE_NAME: `Table_${i}`,
          TABLE_TYPE: 'BASE TABLE',
        })),
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listTables(mockDb)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult.tables).toHaveLength(100)
      expect(parsedResult.count).toBe(100)
    })
  })
})
