import type { DatabaseConnection } from '../../src/database'
import { getProcedureSchema } from '../../src/tools/get-procedure-schema'

interface MockRequest {
  input: jest.MockedFunction<(name: string, value: unknown) => MockRequest>
  query: jest.MockedFunction<
    (query: string) => Promise<{ recordset: unknown[] }>
  >
}

interface MockPool {
  request: jest.MockedFunction<() => MockRequest>
}

describe('getProcedureSchema', () => {
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
    it('should get procedure schema with parameters', async () => {
      const procedureName = 'GetUserById'
      const schemaName = 'dbo'
      const mockResult = {
        recordset: [
          {
            PARAMETER_NAME: '@userId',
            DATA_TYPE: 'int',
            PARAMETER_MODE: 'IN',
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: 10,
            NUMERIC_SCALE: 0,
            ORDINAL_POSITION: 1,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.GetUserById @userId int AS SELECT * FROM Users WHERE Id = @userId',
          },
          {
            PARAMETER_NAME: '@userName',
            DATA_TYPE: 'varchar',
            PARAMETER_MODE: 'OUT',
            CHARACTER_MAXIMUM_LENGTH: 100,
            NUMERIC_PRECISION: null,
            NUMERIC_SCALE: null,
            ORDINAL_POSITION: 2,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.GetUserById @userId int, @userName varchar(100) OUTPUT AS SELECT * FROM Users WHERE Id = @userId',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName, schemaName)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).toHaveBeenCalledWith(
        'procedureName',
        procedureName
      )
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain('INFORMATION_SCHEMA.PARAMETERS')
      expect(queryCall).toContain('INFORMATION_SCHEMA.ROUTINES')
      expect(queryCall).toContain('ORDER BY p.ORDINAL_POSITION')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `${schemaName}.${procedureName}`,
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
                  {
                    name: '@userName',
                    dataType: 'varchar',
                    mode: 'OUT',
                    maxLength: 100,
                    precision: null,
                    scale: null,
                    position: 2,
                  },
                ],
                definition: mockResult.recordset[0].ROUTINE_DEFINITION,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should get procedure schema without parameters', async () => {
      const procedureName = 'GetAllUsers'
      const schemaName = 'dbo'
      const mockResult = {
        recordset: [
          {
            PARAMETER_NAME: null,
            DATA_TYPE: null,
            PARAMETER_MODE: null,
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: null,
            NUMERIC_SCALE: null,
            ORDINAL_POSITION: null,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.GetAllUsers AS SELECT * FROM Users',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName, schemaName)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `${schemaName}.${procedureName}`,
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
                definition: mockResult.recordset[0].ROUTINE_DEFINITION,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should get procedure schema with custom schema', async () => {
      const procedureName = 'GetProducts'
      const schemaName = 'sales'
      const mockResult = {
        recordset: [
          {
            PARAMETER_NAME: '@categoryId',
            DATA_TYPE: 'int',
            PARAMETER_MODE: 'IN',
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: 10,
            NUMERIC_SCALE: 0,
            ORDINAL_POSITION: 1,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE sales.GetProducts @categoryId int AS SELECT * FROM Products WHERE CategoryId = @categoryId',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith(
        'procedureName',
        procedureName
      )
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `${schemaName}.${procedureName}`,
                parameters: [
                  {
                    name: '@categoryId',
                    dataType: 'int',
                    mode: 'IN',
                    maxLength: null,
                    precision: 10,
                    scale: 0,
                    position: 1,
                  },
                ],
                definition: mockResult.recordset[0].ROUTINE_DEFINITION,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should handle procedure with complex parameters', async () => {
      const procedureName = 'CreateOrder'
      const mockResult = {
        recordset: [
          {
            PARAMETER_NAME: '@customerId',
            DATA_TYPE: 'int',
            PARAMETER_MODE: 'IN',
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: 10,
            NUMERIC_SCALE: 0,
            ORDINAL_POSITION: 1,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.CreateOrder @customerId int, @orderDate datetime, @totalAmount decimal(10,2) OUTPUT AS BEGIN INSERT INTO Orders (CustomerId, OrderDate) VALUES (@customerId, @orderDate) SET @totalAmount = 0 END',
          },
          {
            PARAMETER_NAME: '@orderDate',
            DATA_TYPE: 'datetime',
            PARAMETER_MODE: 'IN',
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: 23,
            NUMERIC_SCALE: 3,
            ORDINAL_POSITION: 2,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.CreateOrder @customerId int, @orderDate datetime, @totalAmount decimal(10,2) OUTPUT AS BEGIN INSERT INTO Orders (CustomerId, OrderDate) VALUES (@customerId, @orderDate) SET @totalAmount = 0 END',
          },
          {
            PARAMETER_NAME: '@totalAmount',
            DATA_TYPE: 'decimal',
            PARAMETER_MODE: 'OUT',
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: 10,
            NUMERIC_SCALE: 2,
            ORDINAL_POSITION: 3,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.CreateOrder @customerId int, @orderDate datetime, @totalAmount decimal(10,2) OUTPUT AS BEGIN INSERT INTO Orders (CustomerId, OrderDate) VALUES (@customerId, @orderDate) SET @totalAmount = 0 END',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `dbo.${procedureName}`,
                parameters: [
                  {
                    name: '@customerId',
                    dataType: 'int',
                    mode: 'IN',
                    maxLength: null,
                    precision: 10,
                    scale: 0,
                    position: 1,
                  },
                  {
                    name: '@orderDate',
                    dataType: 'datetime',
                    mode: 'IN',
                    maxLength: null,
                    precision: 23,
                    scale: 3,
                    position: 2,
                  },
                  {
                    name: '@totalAmount',
                    dataType: 'decimal',
                    mode: 'OUT',
                    maxLength: null,
                    precision: 10,
                    scale: 2,
                    position: 3,
                  },
                ],
                definition: mockResult.recordset[0].ROUTINE_DEFINITION,
              },
              null,
              2
            ),
          },
        ],
      })
    })

    it('should handle procedure not found', async () => {
      const procedureName = 'NonExistentProcedure'
      const mockResult = {
        recordset: [],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                procedure: `dbo.${procedureName}`,
                parameters: [],
                definition: null,
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
      const procedureName = 'TestProcedure'
      const error = new Error('Database connection failed')

      mockRequest.query.mockRejectedValue(error)

      const result = await getProcedureSchema(mockDb, procedureName)

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
      const procedureName = 'TestProcedure'
      const error = 'Unknown database error'

      mockRequest.query.mockRejectedValue(error)

      const result = await getProcedureSchema(mockDb, procedureName)

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
      const procedureName = 'TestProcedure'
      const error = new Error('Pool request failed')

      mockPool.request.mockImplementation(() => {
        throw error
      })

      const result = await getProcedureSchema(mockDb, procedureName)

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
    it('should build correct query', async () => {
      const procedureName = 'TestProcedure'
      const schemaName = 'dbo'
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await getProcedureSchema(mockDb, procedureName, schemaName)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('SELECT')
      expect(queryCall).toContain('p.PARAMETER_NAME')
      expect(queryCall).toContain('p.DATA_TYPE')
      expect(queryCall).toContain('p.PARAMETER_MODE')
      expect(queryCall).toContain('p.CHARACTER_MAXIMUM_LENGTH')
      expect(queryCall).toContain('p.NUMERIC_PRECISION')
      expect(queryCall).toContain('p.NUMERIC_SCALE')
      expect(queryCall).toContain('p.ORDINAL_POSITION')
      expect(queryCall).toContain('r.ROUTINE_DEFINITION')
      expect(queryCall).toContain('FROM INFORMATION_SCHEMA.PARAMETERS p')
      expect(queryCall).toContain('INNER JOIN INFORMATION_SCHEMA.ROUTINES r')
      expect(queryCall).toContain('ON p.SPECIFIC_NAME = r.SPECIFIC_NAME')
      expect(queryCall).toContain('WHERE r.ROUTINE_NAME = @procedureName')
      expect(queryCall).toContain('AND r.ROUTINE_SCHEMA = @schemaName')
      expect(queryCall).toContain("AND r.ROUTINE_TYPE = 'PROCEDURE'")
      expect(queryCall).toContain('ORDER BY p.ORDINAL_POSITION')
    })

    it('should use default schema when not provided', async () => {
      const procedureName = 'TestProcedure'
      const mockResult = { recordset: [] }
      mockRequest.query.mockResolvedValue(mockResult)

      await getProcedureSchema(mockDb, procedureName)

      expect(mockRequest.input).toHaveBeenCalledWith(
        'procedureName',
        procedureName
      )
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', 'dbo')
    })
  })

  describe('result format', () => {
    it('should return procedure schema in correct format', async () => {
      const procedureName = 'TestProcedure'
      const mockResult = {
        recordset: [
          {
            PARAMETER_NAME: '@param1',
            DATA_TYPE: 'varchar',
            PARAMETER_MODE: 'IN',
            CHARACTER_MAXIMUM_LENGTH: 50,
            NUMERIC_PRECISION: null,
            NUMERIC_SCALE: null,
            ORDINAL_POSITION: 1,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.TestProcedure @param1 varchar(50) AS SELECT 1',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult).toHaveProperty('procedure')
      expect(parsedResult).toHaveProperty('parameters')
      expect(parsedResult).toHaveProperty('definition')
      expect(parsedResult.procedure).toBe('dbo.TestProcedure')
      expect(parsedResult.parameters).toHaveLength(1)
      expect(parsedResult.parameters[0]).toHaveProperty('name')
      expect(parsedResult.parameters[0]).toHaveProperty('dataType')
      expect(parsedResult.parameters[0]).toHaveProperty('mode')
      expect(parsedResult.parameters[0]).toHaveProperty('maxLength')
      expect(parsedResult.parameters[0]).toHaveProperty('precision')
      expect(parsedResult.parameters[0]).toHaveProperty('scale')
      expect(parsedResult.parameters[0]).toHaveProperty('position')
    })

    it('should handle null values in parameters', async () => {
      const procedureName = 'TestProcedure'
      const mockResult = {
        recordset: [
          {
            PARAMETER_NAME: '@param1',
            DATA_TYPE: 'int',
            PARAMETER_MODE: 'IN',
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: null,
            NUMERIC_SCALE: null,
            ORDINAL_POSITION: 1,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.TestProcedure @param1 int AS SELECT 1',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult.parameters[0].maxLength).toBeNull()
      expect(parsedResult.parameters[0].precision).toBeNull()
      expect(parsedResult.parameters[0].scale).toBeNull()
    })
  })

  describe('parameter mapping', () => {
    it('should correctly map parameter properties', async () => {
      const procedureName = 'TestProcedure'
      const mockResult = {
        recordset: [
          {
            PARAMETER_NAME: '@testParam',
            DATA_TYPE: 'decimal',
            PARAMETER_MODE: 'OUT',
            CHARACTER_MAXIMUM_LENGTH: null,
            NUMERIC_PRECISION: 18,
            NUMERIC_SCALE: 2,
            ORDINAL_POSITION: 1,
            ROUTINE_DEFINITION:
              'CREATE PROCEDURE dbo.TestProcedure @testParam decimal(18,2) OUTPUT AS SELECT 1',
          },
        ],
      }

      mockRequest.query.mockResolvedValue(mockResult)

      const result = await getProcedureSchema(mockDb, procedureName)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult.parameters[0].name).toBe('@testParam')
      expect(parsedResult.parameters[0].dataType).toBe('decimal')
      expect(parsedResult.parameters[0].mode).toBe('OUT')
      expect(parsedResult.parameters[0].maxLength).toBeNull()
      expect(parsedResult.parameters[0].precision).toBe(18)
      expect(parsedResult.parameters[0].scale).toBe(2)
      expect(parsedResult.parameters[0].position).toBe(1)
    })
  })
})
