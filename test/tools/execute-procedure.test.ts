import type { DatabaseConnection } from '../../src/database'
import { executeProcedure } from '../../src/tools/execute-procedure'
import { sanitizeParameters } from '../../src/utils/sanitize-parameters'

jest.mock('../../src/utils/sanitize-parameters')

const mockSanitizeParameters = sanitizeParameters as jest.MockedFunction<
  typeof sanitizeParameters
>

interface MockRequest {
  input: jest.MockedFunction<(name: string, value: unknown) => MockRequest>
  execute: jest.MockedFunction<
    (procedureName: string) => Promise<{
      recordsets: unknown[]
      recordset: unknown[]
      output: Record<string, unknown>
      returnValue: unknown
      rowsAffected: number[]
    }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('executeProcedure', () => {
  let mockDb: jest.Mocked<DatabaseConnection>
  let mockPool: MockPool
  let mockRequest: MockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      input: jest.fn().mockReturnThis(),
      execute: jest.fn(),
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

    mockSanitizeParameters.mockImplementation((params) => params)
  })

  describe('successful execution', () => {
    it('should execute procedure without parameters', async () => {
      const procedureName = 'GetUsers'
      const schemaName = 'dbo'
      const mockResult = {
        recordsets: [
          [
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' },
          ],
        ],
        recordset: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        output: {},
        returnValue: 0,
        rowsAffected: [2],
      }

      mockRequest.execute.mockResolvedValue(mockResult)

      const result = await executeProcedure(
        mockDb,
        procedureName,
        undefined,
        schemaName
      )

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.execute).toHaveBeenCalledWith(
        `${schemaName}.${procedureName}`
      )
      expect(mockRequest.input).not.toHaveBeenCalled()
      expect(mockSanitizeParameters).not.toHaveBeenCalled()

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `${schemaName}.${procedureName}`,
                recordsets: mockResult.recordsets,
                recordset: mockResult.recordset,
                output: mockResult.output,
                returnValue: mockResult.returnValue,
                rowsAffected: mockResult.rowsAffected,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should execute procedure with parameters', async () => {
      const procedureName = 'GetUserById'
      const schemaName = 'dbo'
      const parameters = { userId: 123, active: true }
      const sanitizedParams = { userId: 123, active: true }
      const mockResult = {
        recordsets: [[{ id: 123, name: 'John', active: true }]],
        recordset: [{ id: 123, name: 'John', active: true }],
        output: { totalCount: 1 },
        returnValue: 0,
        rowsAffected: [1],
      }

      mockSanitizeParameters.mockReturnValue(sanitizedParams)
      mockRequest.execute.mockResolvedValue(mockResult)

      const result = await executeProcedure(
        mockDb,
        procedureName,
        parameters,
        schemaName
      )

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockSanitizeParameters).toHaveBeenCalledWith(parameters)
      expect(mockRequest.input).toHaveBeenCalledWith('userId', 123)
      expect(mockRequest.input).toHaveBeenCalledWith('active', true)
      expect(mockRequest.execute).toHaveBeenCalledWith(
        `${schemaName}.${procedureName}`
      )

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `${schemaName}.${procedureName}`,
                recordsets: mockResult.recordsets,
                recordset: mockResult.recordset,
                output: mockResult.output,
                returnValue: mockResult.returnValue,
                rowsAffected: mockResult.rowsAffected,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should execute procedure with custom schema', async () => {
      const procedureName = 'GetProducts'
      const schemaName = 'sales'
      const mockResult = {
        recordsets: [[{ id: 1, name: 'Product 1' }]],
        recordset: [{ id: 1, name: 'Product 1' }],
        output: {},
        returnValue: 0,
        rowsAffected: [1],
      }

      mockRequest.execute.mockResolvedValue(mockResult)

      const result = await executeProcedure(
        mockDb,
        procedureName,
        undefined,
        schemaName
      )

      expect(mockRequest.execute).toHaveBeenCalledWith(
        `${schemaName}.${procedureName}`
      )

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `${schemaName}.${procedureName}`,
                recordsets: mockResult.recordsets,
                recordset: mockResult.recordset,
                output: mockResult.output,
                returnValue: mockResult.returnValue,
                rowsAffected: mockResult.rowsAffected,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should handle procedure with output parameters', async () => {
      const procedureName = 'GetUserCount'
      const parameters = { status: 'active' }
      const mockResult = {
        recordsets: [[]],
        recordset: [],
        output: { totalCount: 150, lastUpdated: '2024-01-01' },
        returnValue: 0,
        rowsAffected: [0],
      }

      mockSanitizeParameters.mockReturnValue(parameters)
      mockRequest.execute.mockResolvedValue(mockResult)

      const result = await executeProcedure(mockDb, procedureName, parameters)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `dbo.${procedureName}`,
                recordsets: mockResult.recordsets,
                recordset: mockResult.recordset,
                output: mockResult.output,
                returnValue: mockResult.returnValue,
                rowsAffected: mockResult.rowsAffected,
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
      const procedureName = 'InvalidProcedure'
      const error = new Error('Procedure not found')

      mockRequest.execute.mockRejectedValue(error)

      const result = await executeProcedure(mockDb, procedureName)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Procedure not found',
          },
        ],
        isError: true,
      })
    })

    it('should handle unknown errors', async () => {
      const procedureName = 'TestProcedure'
      const error = 'Unknown error'

      mockRequest.execute.mockRejectedValue(error)

      const result = await executeProcedure(mockDb, procedureName)

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

    it('should handle sanitize parameters error', async () => {
      const procedureName = 'TestProcedure'
      const parameters = { invalid: 'param' }
      const error = new Error('Invalid parameter')

      mockSanitizeParameters.mockImplementation(() => {
        throw error
      })

      const result = await executeProcedure(mockDb, procedureName, parameters)

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
  })

  describe('parameter handling', () => {
    it('should handle null parameters', async () => {
      const procedureName = 'TestProcedure'
      const mockResult = {
        recordsets: [[]],
        recordset: [],
        output: {},
        returnValue: 0,
        rowsAffected: [0],
      }

      mockRequest.execute.mockResolvedValue(mockResult)

      const result = await executeProcedure(mockDb, procedureName, undefined)

      expect(mockSanitizeParameters).not.toHaveBeenCalled()
      expect(mockRequest.input).not.toHaveBeenCalled()
      expect(result.content[0].text).toContain(
        '"procedure": "dbo.TestProcedure"'
      )
    })

    it('should handle empty parameters object', async () => {
      const procedureName = 'TestProcedure'
      const parameters = {}
      const mockResult = {
        recordsets: [[]],
        recordset: [],
        output: {},
        returnValue: 0,
        rowsAffected: [0],
      }

      mockSanitizeParameters.mockReturnValue(parameters)
      mockRequest.execute.mockResolvedValue(mockResult)

      const result = await executeProcedure(mockDb, procedureName, parameters)

      expect(mockSanitizeParameters).toHaveBeenCalledWith(parameters)
      expect(mockRequest.input).not.toHaveBeenCalled()
      expect(result.content[0].text).toContain(
        '"procedure": "dbo.TestProcedure"'
      )
    })
  })
})
