import type { DatabaseConnection } from '../../src/database'
import { executeQuery } from '../../src/tools/execute-query'
import { sanitizeParameters } from '../../src/utils/sanitize-parameters'
import { validateQuery } from '../../src/utils/validate-query'

jest.mock('../../src/utils/sanitize-parameters')
jest.mock('../../src/utils/validate-query')

const mockSanitizeParameters = sanitizeParameters as jest.MockedFunction<
  typeof sanitizeParameters
>

const mockValidateQuery = validateQuery as jest.MockedFunction<
  typeof validateQuery
>

interface MockRequest {
  input: jest.MockedFunction<(name: string, value: unknown) => MockRequest>
  query: jest.MockedFunction<
    (query: string) => Promise<{ recordset: unknown[] }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('executeQuery', () => {
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

    mockValidateQuery.mockReturnValue(true)
    mockSanitizeParameters.mockImplementation((params) => params)
  })

  describe('successful execution', () => {
    it('should execute simple query without parameters', async () => {
      const query = 'SELECT * FROM users'
      const mockResult = {
        recordset: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await executeQuery(mockDb, query)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockValidateQuery).toHaveBeenCalledWith(query)
      expect(mockRequest.query).toHaveBeenCalledWith(query)
      expect(mockRequest.input).not.toHaveBeenCalled()

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockResult.recordset, null, 2),
          },
        ],
      })
    })

    it('should execute query with parameters', async () => {
      const query = 'SELECT * FROM users WHERE id = @userId'
      const parameters = { userId: 123 }
      const sanitizedParams = { userId: 123 }
      const mockResult = {
        recordset: [{ id: 123, name: 'John' }],
      }

      mockSanitizeParameters.mockReturnValue(sanitizedParams)
      mockRequest.query.mockResolvedValue(mockResult)

      const result = await executeQuery(mockDb, query, parameters)

      expect(mockSanitizeParameters).toHaveBeenCalledWith(parameters)
      expect(mockRequest.input).toHaveBeenCalledWith('userId', 123)
      expect(mockRequest.query).toHaveBeenCalledWith(query)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockResult.recordset, null, 2),
          },
        ],
      })
    })

    it('should add multiple parameters correctly', async () => {
      const query =
        'SELECT * FROM users WHERE id = @userId AND status = @status'
      const parameters = { userId: 123, status: 'active' }
      const sanitizedParams = { userId: 123, status: 'active' }
      const mockResult = { recordset: [] }

      mockSanitizeParameters.mockReturnValue(sanitizedParams)
      mockRequest.query.mockResolvedValue(mockResult)

      await executeQuery(mockDb, query, parameters)

      expect(mockRequest.input).toHaveBeenCalledWith('userId', 123)
      expect(mockRequest.input).toHaveBeenCalledWith('status', 'active')
      expect(mockRequest.input).toHaveBeenCalledTimes(2)
    })

    it('should return empty result when no records found', async () => {
      const query = 'SELECT * FROM users WHERE id = 999'
      const mockResult = { recordset: [] }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await executeQuery(mockDb, query)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify([], null, 2),
          },
        ],
      })
    })
  })

  describe('error handling', () => {
    it('should block invalid query', async () => {
      const query = 'DROP TABLE users'
      mockValidateQuery.mockReturnValue(false)

      const result = await executeQuery(mockDb, query)

      expect(mockValidateQuery).toHaveBeenCalledWith(query)
      expect(mockRequest.query).not.toHaveBeenCalled()

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Potentially destructive command blocked.',
          },
        ],
        isError: true,
      })
    })

    it('should handle database connection error', async () => {
      const query = 'SELECT * FROM users'
      const errorMessage = 'Connection timeout'

      mockRequest.query.mockRejectedValue(new Error(errorMessage))

      const result = await executeQuery(mockDb, query)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Erro: ${errorMessage}`,
          },
        ],
        isError: true,
      })
    })

    it('should handle unknown error', async () => {
      const query = 'SELECT * FROM users'

      mockRequest.query.mockRejectedValue('Unknown error')

      const result = await executeQuery(mockDb, query)

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

    it('should handle parameter sanitization error', async () => {
      const query = 'SELECT * FROM users WHERE id = @userId'
      const parameters = { userId: 'invalid' }

      mockSanitizeParameters.mockImplementation(() => {
        throw new Error('Invalid parameter')
      })

      const result = await executeQuery(mockDb, query, parameters)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Invalid parameter',
          },
        ],
        isError: true,
      })
    })

    it('should handle connection pool error', async () => {
      const query = 'SELECT * FROM users'

      mockDb.getPool.mockImplementation(() => {
        throw new Error('Failed to connect to database')
      })

      const result = await executeQuery(mockDb, query)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Failed to connect to database',
          },
        ],
        isError: true,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty parameters', async () => {
      const query = 'SELECT * FROM users'
      const parameters = {}
      const mockResult = { recordset: [] }

      mockRequest.query.mockResolvedValue(mockResult)

      await executeQuery(mockDb, query, parameters)

      expect(mockSanitizeParameters).toHaveBeenCalledWith(parameters)
      expect(mockRequest.input).not.toHaveBeenCalled()
      expect(mockRequest.query).toHaveBeenCalledWith(query)
    })

    it('should handle null/undefined parameters', async () => {
      const query = 'SELECT * FROM users'
      const mockResult = { recordset: [] }

      mockRequest.query.mockResolvedValue(mockResult)

      // Test with undefined
      await executeQuery(mockDb, query, undefined)
      expect(mockSanitizeParameters).not.toHaveBeenCalled()

      // Reset and test with null
      jest.clearAllMocks()
      mockRequest.query.mockResolvedValue(mockResult)

      await executeQuery(
        mockDb,
        query,
        null as unknown as Record<string, unknown>
      )
      expect(mockSanitizeParameters).not.toHaveBeenCalled()
    })

    it('should preserve complex recordset structure', async () => {
      const query = 'SELECT * FROM orders'
      const mockResult = {
        recordset: [
          {
            id: 1,
            customer: { name: 'John', email: 'john@example.com' },
            items: [{ product: 'Product A', quantity: 2 }],
            total: 100.5,
            createdAt: new Date('2024-01-01'),
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await executeQuery(mockDb, query)

      expect(result.content[0].text).toBe(
        JSON.stringify(mockResult.recordset, null, 2)
      )
    })

    it('should handle parameters with various data types', async () => {
      const query =
        'SELECT * FROM users WHERE created_at > @date AND active = @active AND count > @count'
      const parameters = {
        date: new Date('2024-01-01'),
        active: true,
        count: 5,
      }
      const mockResult = { recordset: [] }

      mockSanitizeParameters.mockReturnValue(parameters)
      mockRequest.query.mockResolvedValue(mockResult)

      await executeQuery(mockDb, query, parameters)

      expect(mockRequest.input).toHaveBeenCalledWith('date', parameters.date)
      expect(mockRequest.input).toHaveBeenCalledWith('active', true)
      expect(mockRequest.input).toHaveBeenCalledWith('count', 5)
      expect(mockRequest.input).toHaveBeenCalledTimes(3)
    })
  })
})
