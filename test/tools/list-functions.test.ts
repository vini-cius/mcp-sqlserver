import type { DatabaseConnection } from '../../src/database'
import { listFunctions } from '../../src/tools/list-functions'

interface MockRequest {
  input: jest.MockedFunction<(name: string, value: unknown) => MockRequest>
  query: jest.MockedFunction<
    (query: string) => Promise<{ recordset: unknown[] }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('listFunctions', () => {
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
    it('should list all functions without filters', async () => {
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'CalculateTotal',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'int',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
            FUNCTION_TYPE: 'SCALAR',
          },
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'GetUserOrders',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'TABLE',
            CREATED: '2024-01-02T00:00:00.000Z',
            LAST_ALTERED: '2024-01-10T00:00:00.000Z',
            FUNCTION_TYPE: 'TABLE-VALUED',
          },
          {
            ROUTINE_SCHEMA: 'sales',
            ROUTINE_NAME: 'GetProductList',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'TABLE',
            CREATED: '2024-01-03T00:00:00.000Z',
            LAST_ALTERED: '2024-01-20T00:00:00.000Z',
            FUNCTION_TYPE: 'TABLE-VALUED',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listFunctions(mockDb)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).not.toHaveBeenCalled()
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("ROUTINE_TYPE = 'FUNCTION'")
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                functions: mockResult.recordset,
                count: mockResult.recordset.length,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should list functions with schema filter', async () => {
      const schemaName = 'dbo'
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'CalculateTotal',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'int',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
            FUNCTION_TYPE: 'SCALAR',
          },
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'GetUserOrders',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'TABLE',
            CREATED: '2024-01-02T00:00:00.000Z',
            LAST_ALTERED: '2024-01-10T00:00:00.000Z',
            FUNCTION_TYPE: 'TABLE-VALUED',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listFunctions(mockDb, schemaName)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("ROUTINE_TYPE = 'FUNCTION'")
      expect(queryCall).toContain('AND ROUTINE_SCHEMA = @schemaName')
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                functions: mockResult.recordset,
                count: mockResult.recordset.length,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should list only scalar functions', async () => {
      const functionType = 'SCALAR'
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'CalculateTotal',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'int',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
            FUNCTION_TYPE: 'SCALAR',
          },
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'GetUserName',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'varchar',
            CREATED: '2024-01-02T00:00:00.000Z',
            LAST_ALTERED: '2024-01-10T00:00:00.000Z',
            FUNCTION_TYPE: 'SCALAR',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listFunctions(mockDb, undefined, functionType)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("ROUTINE_TYPE = 'FUNCTION'")
      expect(queryCall).toContain("AND DATA_TYPE != 'TABLE'")
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                functions: mockResult.recordset,
                count: mockResult.recordset.length,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should list only table-valued functions', async () => {
      const functionType = 'TABLE'
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'GetUserOrders',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'TABLE',
            CREATED: '2024-01-02T00:00:00.000Z',
            LAST_ALTERED: '2024-01-10T00:00:00.000Z',
            FUNCTION_TYPE: 'TABLE-VALUED',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listFunctions(mockDb, undefined, functionType)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("ROUTINE_TYPE = 'FUNCTION'")
      expect(queryCall).toContain("AND DATA_TYPE = 'TABLE'")
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                functions: mockResult.recordset,
                count: mockResult.recordset.length,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should list functions with both schema and type filters', async () => {
      const schemaName = 'dbo'
      const functionType = 'SCALAR'
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'CalculateTotal',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'int',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
            FUNCTION_TYPE: 'SCALAR',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listFunctions(mockDb, schemaName, functionType)

      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('AND ROUTINE_SCHEMA = @schemaName')
      expect(queryCall).toContain("AND DATA_TYPE != 'TABLE'")

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                functions: mockResult.recordset,
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

      const result = await listFunctions(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                functions: [],
                count: 0,
              },
              null,
              2
            ),
          },
        ],
      })
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')

      mockRequest.query.mockRejectedValue(error)

      const result = await listFunctions(mockDb)

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

      const result = await listFunctions(mockDb)

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

      const result = await listFunctions(mockDb)

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
    it('should build correct base query', async () => {
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listFunctions(mockDb)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain('ROUTINE_SCHEMA')
      expect(queryCall).toContain('ROUTINE_NAME')
      expect(queryCall).toContain('ROUTINE_TYPE')
      expect(queryCall).toContain('DATA_TYPE')
      expect(queryCall).toContain('CREATED')
      expect(queryCall).toContain('LAST_ALTERED')
      expect(queryCall).toContain('CASE')
      expect(queryCall).toContain(
        "WHEN DATA_TYPE = 'TABLE' THEN 'TABLE-VALUED'"
      )
      expect(queryCall).toContain("ELSE 'SCALAR'")
      expect(queryCall).toContain('END AS FUNCTION_TYPE')
      expect(queryCall).toContain('FROM INFORMATION_SCHEMA.ROUTINES')
      expect(queryCall).toContain("WHERE ROUTINE_TYPE = 'FUNCTION'")
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')
    })

    it('should build query with schema filter', async () => {
      const schemaName = 'test'
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listFunctions(mockDb, schemaName)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('AND ROUTINE_SCHEMA = @schemaName')
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
    })

    it('should build query with SCALAR type filter', async () => {
      const functionType = 'SCALAR'
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listFunctions(mockDb, undefined, functionType)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain("AND DATA_TYPE != 'TABLE'")
    })

    it('should build query with TABLE type filter', async () => {
      const functionType = 'TABLE'
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listFunctions(mockDb, undefined, functionType)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain("AND DATA_TYPE = 'TABLE'")
    })
  })

  describe('result format', () => {
    it('should return functions in correct format', async () => {
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'TestFunction',
            ROUTINE_TYPE: 'FUNCTION',
            DATA_TYPE: 'int',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
            FUNCTION_TYPE: 'SCALAR',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listFunctions(mockDb)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult).toHaveProperty('functions')
      expect(parsedResult).toHaveProperty('count')
      expect(parsedResult.functions).toEqual(mockResult.recordset)
      expect(parsedResult.count).toBe(mockResult.recordset.length)
    })
  })
})
