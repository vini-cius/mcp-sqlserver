import type { DatabaseConnection } from '../../src/database'
import { listProcedures } from '../../src/tools/list-procedures'

interface MockRequest {
  input: jest.MockedFunction<(name: string, value: unknown) => MockRequest>
  query: jest.MockedFunction<
    (query: string) => Promise<{ recordset: unknown[] }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('listProcedures', () => {
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
    it('should list all procedures without schema filter', async () => {
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'GetUsers',
            ROUTINE_TYPE: 'PROCEDURE',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
          },
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'CreateUser',
            ROUTINE_TYPE: 'PROCEDURE',
            CREATED: '2024-01-02T00:00:00.000Z',
            LAST_ALTERED: '2024-01-10T00:00:00.000Z',
          },
          {
            ROUTINE_SCHEMA: 'sales',
            ROUTINE_NAME: 'GetOrders',
            ROUTINE_TYPE: 'PROCEDURE',
            CREATED: '2024-01-03T00:00:00.000Z',
            LAST_ALTERED: '2024-01-20T00:00:00.000Z',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listProcedures(mockDb)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).not.toHaveBeenCalled()
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("ROUTINE_TYPE = 'PROCEDURE'")
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedures: mockResult.recordset,
                count: mockResult.recordset.length,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should list procedures with schema filter', async () => {
      const schemaName = 'dbo'
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'GetUsers',
            ROUTINE_TYPE: 'PROCEDURE',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
          },
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'CreateUser',
            ROUTINE_TYPE: 'PROCEDURE',
            CREATED: '2024-01-02T00:00:00.000Z',
            LAST_ALTERED: '2024-01-10T00:00:00.000Z',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listProcedures(mockDb, schemaName)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain("ROUTINE_TYPE = 'PROCEDURE'")
      expect(queryCall).toContain('AND ROUTINE_SCHEMA = @schemaName')
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedures: mockResult.recordset,
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

      const result = await listProcedures(mockDb)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedures: [],
                count: 0,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should handle custom schema with no procedures', async () => {
      const schemaName = 'nonexistent'
      const mockResult = {
        recordset: [],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listProcedures(mockDb, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
      expect(result.content[0].text).toContain('"procedures": []')
      expect(result.content[0].text).toContain('"count": 0')
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')

      mockRequest.query.mockRejectedValue(error)

      const result = await listProcedures(mockDb)

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

      const result = await listProcedures(mockDb)

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

      const result = await listProcedures(mockDb)

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

      await listProcedures(mockDb)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain('ROUTINE_SCHEMA')
      expect(queryCall).toContain('ROUTINE_NAME')
      expect(queryCall).toContain('ROUTINE_TYPE')
      expect(queryCall).toContain('CREATED')
      expect(queryCall).toContain('LAST_ALTERED')
      expect(queryCall).toContain('FROM INFORMATION_SCHEMA.ROUTINES')
      expect(queryCall).toContain("WHERE ROUTINE_TYPE = 'PROCEDURE'")
      expect(queryCall).toContain('ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME')
      expect(queryCall).not.toContain('@schemaName')
    })

    it('should build correct query with schema filter', async () => {
      const schemaName = 'test'
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await listProcedures(mockDb, schemaName)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('AND ROUTINE_SCHEMA = @schemaName')
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
    })
  })

  describe('result format', () => {
    it('should return procedures in correct format', async () => {
      const mockResult = {
        recordset: [
          {
            ROUTINE_SCHEMA: 'dbo',
            ROUTINE_NAME: 'TestProcedure',
            ROUTINE_TYPE: 'PROCEDURE',
            CREATED: '2024-01-01T00:00:00.000Z',
            LAST_ALTERED: '2024-01-15T00:00:00.000Z',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await listProcedures(mockDb)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult).toHaveProperty('procedures')
      expect(parsedResult).toHaveProperty('count')
      expect(parsedResult.procedures).toEqual(mockResult.recordset)
      expect(parsedResult.count).toBe(mockResult.recordset.length)
    })
  })
})
