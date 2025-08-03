import type { DatabaseConnection } from '../../src/database'
import { getFunctionSchema } from '../../src/tools/get-function-schema'

// Type definitions for MSSQL mocks
interface MockRequest {
  input: jest.MockedFunction<(name: string, value: unknown) => MockRequest>
  query: jest.MockedFunction<
    (query: string) => Promise<{ recordset: unknown[] }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('getFunctionSchema', () => {
  let mockDb: jest.Mocked<DatabaseConnection>
  let mockPool: MockPool
  let mockRequest: MockRequest

  const mockScalarFunction = [
    {
      PARAMETER_NAME: '@input1',
      DATA_TYPE: 'int',
      PARAMETER_MODE: 'IN',
      CHARACTER_MAXIMUM_LENGTH: null,
      NUMERIC_PRECISION: 10,
      NUMERIC_SCALE: 0,
      ORDINAL_POSITION: 1,
      ROUTINE_DEFINITION:
        'CREATE FUNCTION dbo.CalculateTotal (@input1 int, @input2 decimal(10,2)) RETURNS decimal(10,2) AS BEGIN RETURN @input1 * @input2 END',
      RETURN_TYPE: 'decimal',
      FUNCTION_TYPE: 'SCALAR',
    },
    {
      PARAMETER_NAME: '@input2',
      DATA_TYPE: 'decimal',
      PARAMETER_MODE: 'IN',
      CHARACTER_MAXIMUM_LENGTH: null,
      NUMERIC_PRECISION: 10,
      NUMERIC_SCALE: 2,
      ORDINAL_POSITION: 2,
      ROUTINE_DEFINITION:
        'CREATE FUNCTION dbo.CalculateTotal (@input1 int, @input2 decimal(10,2)) RETURNS decimal(10,2) AS BEGIN RETURN @input1 * @input2 END',
      RETURN_TYPE: 'decimal',
      FUNCTION_TYPE: 'SCALAR',
    },
  ]

  const mockTableValuedFunction = [
    {
      PARAMETER_NAME: '@userId',
      DATA_TYPE: 'int',
      PARAMETER_MODE: 'IN',
      CHARACTER_MAXIMUM_LENGTH: null,
      NUMERIC_PRECISION: 10,
      NUMERIC_SCALE: 0,
      ORDINAL_POSITION: 1,
      ROUTINE_DEFINITION:
        'CREATE FUNCTION dbo.GetUserOrders (@userId int) RETURNS TABLE AS RETURN SELECT * FROM Orders WHERE UserId = @userId',
      RETURN_TYPE: 'TABLE',
      FUNCTION_TYPE: 'TABLE-VALUED',
    },
  ]

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock request
    mockRequest = {
      input: jest.fn().mockReturnThis(),
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
    it('should retrieve scalar function schema with default schema name', async () => {
      const functionName = 'CalculateTotal'
      mockRequest.query.mockResolvedValue({ recordset: mockScalarFunction })

      const result = await getFunctionSchema(mockDb, functionName)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).toHaveBeenCalledWith(
        'functionName',
        functionName
      )
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', 'dbo')
      expect(mockRequest.input).toHaveBeenCalledTimes(2)

      const expectedResult = {
        function: 'dbo.CalculateTotal',
        functionType: 'SCALAR',
        returnType: 'decimal',
        parameters: [
          {
            name: '@input1',
            dataType: 'int',
            mode: 'IN',
            maxLength: null,
            precision: 10,
            scale: 0,
            position: 1,
          },
          {
            name: '@input2',
            dataType: 'decimal',
            mode: 'IN',
            maxLength: null,
            precision: 10,
            scale: 2,
            position: 2,
          },
        ],
        definition:
          'CREATE FUNCTION dbo.CalculateTotal (@input1 int, @input2 decimal(10,2)) RETURNS decimal(10,2) AS BEGIN RETURN @input1 * @input2 END',
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedResult, null, 2),
          },
        ],
      })
    })

    it('should retrieve table-valued function schema with custom schema name', async () => {
      const functionName = 'GetUserOrders'
      const schemaName = 'analytics'
      mockRequest.query.mockResolvedValue({
        recordset: mockTableValuedFunction,
      })

      const result = await getFunctionSchema(mockDb, functionName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith(
        'functionName',
        functionName
      )
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)

      const expectedResult = {
        function: 'analytics.GetUserOrders',
        functionType: 'TABLE-VALUED',
        returnType: 'TABLE',
        parameters: [
          {
            name: '@userId',
            dataType: 'int',
            mode: 'IN',
            maxLength: null,
            precision: 10,
            scale: 0,
            position: 1,
          },
        ],
        definition:
          'CREATE FUNCTION dbo.GetUserOrders (@userId int) RETURNS TABLE AS RETURN SELECT * FROM Orders WHERE UserId = @userId',
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedResult, null, 2),
          },
        ],
      })
    })

    it('should handle function with no parameters', async () => {
      const functionName = 'GetCurrentTimestamp'
      const noParamFunction = [
        {
          PARAMETER_NAME: null,
          DATA_TYPE: null,
          PARAMETER_MODE: null,
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          ORDINAL_POSITION: null,
          ROUTINE_DEFINITION:
            'CREATE FUNCTION dbo.GetCurrentTimestamp() RETURNS datetime2 AS BEGIN RETURN GETDATE() END',
          RETURN_TYPE: 'datetime2',
          FUNCTION_TYPE: 'SCALAR',
        },
      ]

      mockRequest.query.mockResolvedValue({ recordset: noParamFunction })

      const result = await getFunctionSchema(mockDb, functionName)

      const expectedResult = {
        function: 'dbo.GetCurrentTimestamp',
        functionType: 'SCALAR',
        returnType: 'datetime2',
        parameters: [
          {
            name: null,
            dataType: null,
            mode: null,
            maxLength: null,
            precision: null,
            scale: null,
            position: null,
          },
        ],
        definition:
          'CREATE FUNCTION dbo.GetCurrentTimestamp() RETURNS datetime2 AS BEGIN RETURN GETDATE() END',
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedResult, null, 2),
          },
        ],
      })
    })

    it('should handle function not found (empty recordset)', async () => {
      const functionName = 'NonExistentFunction'
      mockRequest.query.mockResolvedValue({ recordset: [] })

      const result = await getFunctionSchema(mockDb, functionName)

      const expectedResult = {
        function: 'dbo.NonExistentFunction',
        functionType: 'UNKNOWN',
        returnType: 'UNKNOWN',
        parameters: [],
        definition: null,
      }

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(expectedResult, null, 2),
          },
        ],
      })
    })

    it('should verify the correct SQL query is executed', async () => {
      const functionName = 'TestFunction'
      const schemaName = 'test'
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getFunctionSchema(mockDb, functionName, schemaName)

      expect(mockRequest.query).toHaveBeenCalledTimes(1)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('INFORMATION_SCHEMA.PARAMETERS')
      expect(queryCall).toContain('INFORMATION_SCHEMA.ROUTINES')
      expect(queryCall).toContain('WHERE r.ROUTINE_NAME = @functionName')
      expect(queryCall).toContain('AND r.ROUTINE_SCHEMA = @schemaName')
      expect(queryCall).toContain("AND r.ROUTINE_TYPE = 'FUNCTION'")
      expect(queryCall).toContain('ORDER BY p.ORDINAL_POSITION')
    })

    it('should handle function with string parameters', async () => {
      const stringParamFunction = [
        {
          PARAMETER_NAME: '@searchTerm',
          DATA_TYPE: 'nvarchar',
          PARAMETER_MODE: 'IN',
          CHARACTER_MAXIMUM_LENGTH: 100,
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          ORDINAL_POSITION: 1,
          ROUTINE_DEFINITION:
            'CREATE FUNCTION dbo.SearchUsers (@searchTerm nvarchar(100)) RETURNS TABLE AS RETURN SELECT * FROM Users WHERE Name LIKE @searchTerm',
          RETURN_TYPE: 'TABLE',
          FUNCTION_TYPE: 'TABLE-VALUED',
        },
      ]

      const functionName = 'SearchUsers'
      mockRequest.query.mockResolvedValue({ recordset: stringParamFunction })

      const result = await getFunctionSchema(mockDb, functionName)

      const parsedResult = JSON.parse(result.content[0].text as string)
      const parameter = parsedResult.parameters[0]

      expect(parameter.name).toBe('@searchTerm')
      expect(parameter.dataType).toBe('nvarchar')
      expect(parameter.maxLength).toBe(100)
      expect(parameter.precision).toBeNull()
      expect(parameter.scale).toBeNull()
    })

    it('should handle function with multiple parameters of different types', async () => {
      const multiParamFunction = [
        {
          PARAMETER_NAME: '@startDate',
          DATA_TYPE: 'datetime2',
          PARAMETER_MODE: 'IN',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          ORDINAL_POSITION: 1,
          ROUTINE_DEFINITION:
            'CREATE FUNCTION dbo.GetSalesReport (@startDate datetime2, @endDate datetime2, @categoryId int) RETURNS TABLE',
          RETURN_TYPE: 'TABLE',
          FUNCTION_TYPE: 'TABLE-VALUED',
        },
        {
          PARAMETER_NAME: '@endDate',
          DATA_TYPE: 'datetime2',
          PARAMETER_MODE: 'IN',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          ORDINAL_POSITION: 2,
          ROUTINE_DEFINITION:
            'CREATE FUNCTION dbo.GetSalesReport (@startDate datetime2, @endDate datetime2, @categoryId int) RETURNS TABLE',
          RETURN_TYPE: 'TABLE',
          FUNCTION_TYPE: 'TABLE-VALUED',
        },
        {
          PARAMETER_NAME: '@categoryId',
          DATA_TYPE: 'int',
          PARAMETER_MODE: 'IN',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 0,
          ORDINAL_POSITION: 3,
          ROUTINE_DEFINITION:
            'CREATE FUNCTION dbo.GetSalesReport (@startDate datetime2, @endDate datetime2, @categoryId int) RETURNS TABLE',
          RETURN_TYPE: 'TABLE',
          FUNCTION_TYPE: 'TABLE-VALUED',
        },
      ]

      const functionName = 'GetSalesReport'
      mockRequest.query.mockResolvedValue({ recordset: multiParamFunction })

      const result = await getFunctionSchema(mockDb, functionName)

      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult.parameters).toHaveLength(3)
      expect(parsedResult.parameters[0].position).toBe(1)
      expect(parsedResult.parameters[1].position).toBe(2)
      expect(parsedResult.parameters[2].position).toBe(3)
      expect(parsedResult.functionType).toBe('TABLE-VALUED')
    })
  })

  describe('error handling', () => {
    it('should handle connection pool error', async () => {
      mockDb.getPool.mockImplementation(() => {
        throw new Error('Failed to get connection pool')
      })

      const result = await getFunctionSchema(mockDb, 'TestFunction')

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
      mockRequest.query.mockRejectedValue(new Error('Invalid object name'))

      const result = await getFunctionSchema(mockDb, 'NonExistentFunction')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Invalid object name',
          },
        ],
        isError: true,
      })
    })

    it('should handle request creation error', async () => {
      mockPool.request.mockImplementation(() => {
        throw new Error('Failed to create request')
      })

      const result = await getFunctionSchema(mockDb, 'TestFunction')

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

    it('should handle parameter binding error', async () => {
      mockRequest.input.mockImplementation(() => {
        throw new Error('Parameter binding failed')
      })

      const result = await getFunctionSchema(mockDb, 'TestFunction')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Erro: Parameter binding failed',
          },
        ],
        isError: true,
      })
    })

    it('should handle unknown error type', async () => {
      mockRequest.query.mockRejectedValue('Unknown error string')

      const result = await getFunctionSchema(mockDb, 'TestFunction')

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
  })

  describe('parameter validation', () => {
    it('should handle special characters in function name', async () => {
      const functionName = 'Calculate_Total-Value'
      const schemaName = 'analytics_schema'
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getFunctionSchema(mockDb, functionName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith(
        'functionName',
        functionName
      )
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
    })

    it('should handle empty string parameters', async () => {
      const functionName = ''
      const schemaName = ''
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getFunctionSchema(mockDb, functionName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith('functionName', '')
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', '')

      const result = await getFunctionSchema(mockDb, functionName, schemaName)
      const parsedResult = JSON.parse(result.content[0].text as string)
      expect(parsedResult.function).toBe('.')
    })

    it('should handle long function and schema names', async () => {
      const functionName = 'f'.repeat(128) // Max identifier length in SQL Server
      const schemaName = 's'.repeat(128)
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getFunctionSchema(mockDb, functionName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith(
        'functionName',
        functionName
      )
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
    })
  })

  describe('data structure validation', () => {
    it('should preserve all function metadata in correct structure', async () => {
      const functionName = 'TestFunction'
      mockRequest.query.mockResolvedValue({ recordset: mockScalarFunction })

      const result = await getFunctionSchema(mockDb, functionName)
      const parsedResult = JSON.parse(result.content[0].text as string)

      // Verify main structure
      expect(parsedResult).toHaveProperty('function')
      expect(parsedResult).toHaveProperty('functionType')
      expect(parsedResult).toHaveProperty('returnType')
      expect(parsedResult).toHaveProperty('parameters')
      expect(parsedResult).toHaveProperty('definition')

      // Verify function identification
      expect(parsedResult.function).toBe('dbo.TestFunction')
      expect(parsedResult.functionType).toBe('SCALAR')
      expect(parsedResult.returnType).toBe('decimal')

      // Verify parameters structure
      expect(Array.isArray(parsedResult.parameters)).toBe(true)
      expect(parsedResult.parameters).toHaveLength(2)

      // Verify parameter properties
      const firstParam = parsedResult.parameters[0]
      expect(firstParam).toHaveProperty('name')
      expect(firstParam).toHaveProperty('dataType')
      expect(firstParam).toHaveProperty('mode')
      expect(firstParam).toHaveProperty('maxLength')
      expect(firstParam).toHaveProperty('precision')
      expect(firstParam).toHaveProperty('scale')
      expect(firstParam).toHaveProperty('position')

      // Verify definition is included
      expect(parsedResult.definition).toContain('CREATE FUNCTION')
    })

    it('should handle function type determination correctly', async () => {
      // Test SCALAR function
      const scalarFunction = [
        {
          PARAMETER_NAME: '@input',
          DATA_TYPE: 'int',
          PARAMETER_MODE: 'IN',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 0,
          ORDINAL_POSITION: 1,
          ROUTINE_DEFINITION: 'CREATE FUNCTION...',
          RETURN_TYPE: 'int',
          FUNCTION_TYPE: 'SCALAR',
        },
      ]

      mockRequest.query.mockResolvedValue({ recordset: scalarFunction })
      let result = await getFunctionSchema(mockDb, 'ScalarFunc')
      let parsedResult = JSON.parse(result.content[0].text as string)
      expect(parsedResult.functionType).toBe('SCALAR')

      // Test TABLE-VALUED function
      const tableFunction = [
        {
          PARAMETER_NAME: '@input',
          DATA_TYPE: 'int',
          PARAMETER_MODE: 'IN',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 0,
          ORDINAL_POSITION: 1,
          ROUTINE_DEFINITION: 'CREATE FUNCTION...',
          RETURN_TYPE: 'TABLE',
          FUNCTION_TYPE: 'TABLE-VALUED',
        },
      ]

      mockRequest.query.mockResolvedValue({ recordset: tableFunction })
      result = await getFunctionSchema(mockDb, 'TableFunc')
      parsedResult = JSON.parse(result.content[0].text as string)
      expect(parsedResult.functionType).toBe('TABLE-VALUED')
    })
  })
})
