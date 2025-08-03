import type { DatabaseConnection } from '../../src/database'
import { getTableSchema } from '../../src/tools/get-table-schema'

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

describe('getTableSchema', () => {
  let mockDb: jest.Mocked<DatabaseConnection>
  let mockPool: MockPool
  let mockRequest: MockRequest

  const mockColumns = [
    {
      COLUMN_NAME: 'id',
      DATA_TYPE: 'int',
      IS_NULLABLE: 'NO',
      COLUMN_DEFAULT: null,
      CHARACTER_MAXIMUM_LENGTH: null,
      NUMERIC_PRECISION: 10,
      NUMERIC_SCALE: 0,
      IS_PRIMARY_KEY: 'YES',
    },
    {
      COLUMN_NAME: 'name',
      DATA_TYPE: 'varchar',
      IS_NULLABLE: 'NO',
      COLUMN_DEFAULT: null,
      CHARACTER_MAXIMUM_LENGTH: 255,
      NUMERIC_PRECISION: null,
      NUMERIC_SCALE: null,
      IS_PRIMARY_KEY: 'NO',
    },
    {
      COLUMN_NAME: 'email',
      DATA_TYPE: 'varchar',
      IS_NULLABLE: 'YES',
      COLUMN_DEFAULT: null,
      CHARACTER_MAXIMUM_LENGTH: 320,
      NUMERIC_PRECISION: null,
      NUMERIC_SCALE: null,
      IS_PRIMARY_KEY: 'NO',
    },
    {
      COLUMN_NAME: 'created_at',
      DATA_TYPE: 'datetime2',
      IS_NULLABLE: 'NO',
      COLUMN_DEFAULT: 'getdate()',
      CHARACTER_MAXIMUM_LENGTH: null,
      NUMERIC_PRECISION: null,
      NUMERIC_SCALE: null,
      IS_PRIMARY_KEY: 'NO',
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
    it('should retrieve table schema with default schema name', async () => {
      const tableName = 'users'
      mockRequest.query.mockResolvedValue({ recordset: mockColumns })

      const result = await getTableSchema(mockDb, tableName)

      expect(mockDb.getPool).toHaveBeenCalledTimes(1)
      expect(mockPool.request).toHaveBeenCalledTimes(1)
      expect(mockRequest.input).toHaveBeenCalledWith('tableName', tableName)
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', 'dbo')
      expect(mockRequest.input).toHaveBeenCalledTimes(2)

      const expectedResult = {
        table: 'dbo.users',
        columns: mockColumns,
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

    it('should retrieve table schema with custom schema name', async () => {
      const tableName = 'orders'
      const schemaName = 'sales'
      mockRequest.query.mockResolvedValue({ recordset: mockColumns })

      const result = await getTableSchema(mockDb, tableName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith('tableName', tableName)
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)

      const expectedResult = {
        table: 'sales.orders',
        columns: mockColumns,
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

    it('should handle table with no columns (empty recordset)', async () => {
      const tableName = 'empty_table'
      mockRequest.query.mockResolvedValue({ recordset: [] })

      const result = await getTableSchema(mockDb, tableName)

      const expectedResult = {
        table: 'dbo.empty_table',
        columns: [],
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
      const tableName = 'products'
      const schemaName = 'inventory'
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getTableSchema(mockDb, tableName, schemaName)

      expect(mockRequest.query).toHaveBeenCalledTimes(1)

      const queryCall = mockRequest.query.mock.calls[0][0]
      expect(queryCall).toContain('INFORMATION_SCHEMA.COLUMNS')
      expect(queryCall).toContain('PRIMARY KEY')
      expect(queryCall).toContain(
        'WHERE c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @schemaName'
      )
      expect(queryCall).toContain('ORDER BY c.ORDINAL_POSITION')
    })

    it('should handle table with complex column types', async () => {
      const complexColumns = [
        {
          COLUMN_NAME: 'id',
          DATA_TYPE: 'uniqueidentifier',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: 'newid()',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          IS_PRIMARY_KEY: 'YES',
        },
        {
          COLUMN_NAME: 'data',
          DATA_TYPE: 'nvarchar',
          IS_NULLABLE: 'YES',
          COLUMN_DEFAULT: null,
          CHARACTER_MAXIMUM_LENGTH: -1, // MAX
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          IS_PRIMARY_KEY: 'NO',
        },
        {
          COLUMN_NAME: 'price',
          DATA_TYPE: 'decimal',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: '0.00',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 18,
          NUMERIC_SCALE: 2,
          IS_PRIMARY_KEY: 'NO',
        },
      ]

      const tableName = 'complex_table'
      mockRequest.query.mockResolvedValue({ recordset: complexColumns })

      const result = await getTableSchema(mockDb, tableName)

      const expectedResult = {
        table: 'dbo.complex_table',
        columns: complexColumns,
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

    it('should handle table with composite primary key', async () => {
      const compositeKeyColumns = [
        {
          COLUMN_NAME: 'user_id',
          DATA_TYPE: 'int',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: null,
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 0,
          IS_PRIMARY_KEY: 'YES',
        },
        {
          COLUMN_NAME: 'role_id',
          DATA_TYPE: 'int',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: null,
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: 10,
          NUMERIC_SCALE: 0,
          IS_PRIMARY_KEY: 'YES',
        },
        {
          COLUMN_NAME: 'assigned_at',
          DATA_TYPE: 'datetime2',
          IS_NULLABLE: 'NO',
          COLUMN_DEFAULT: 'getdate()',
          CHARACTER_MAXIMUM_LENGTH: null,
          NUMERIC_PRECISION: null,
          NUMERIC_SCALE: null,
          IS_PRIMARY_KEY: 'NO',
        },
      ]

      const tableName = 'user_roles'
      mockRequest.query.mockResolvedValue({ recordset: compositeKeyColumns })

      const result = await getTableSchema(mockDb, tableName)

      const expectedResult = {
        table: 'dbo.user_roles',
        columns: compositeKeyColumns,
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
  })

  describe('error handling', () => {
    it('should handle connection pool error', async () => {
      mockDb.getPool.mockImplementation(() => {
        throw new Error('Failed to get connection pool')
      })

      const result = await getTableSchema(mockDb, 'users')

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

      const result = await getTableSchema(mockDb, 'nonexistent_table')

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

      const result = await getTableSchema(mockDb, 'users')

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

      const result = await getTableSchema(mockDb, 'users')

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

      const result = await getTableSchema(mockDb, 'users')

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
    it('should handle special characters in table name', async () => {
      const tableName = 'user-data_table'
      const schemaName = 'test_schema'
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getTableSchema(mockDb, tableName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith('tableName', tableName)
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
    })

    it('should handle empty string parameters', async () => {
      const tableName = ''
      const schemaName = ''
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getTableSchema(mockDb, tableName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith('tableName', '')
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', '')

      const expectedResult = {
        table: '.',
        columns: [],
      }

      const result = await getTableSchema(mockDb, tableName, schemaName)
      expect(result.content[0].text).toContain(
        JSON.stringify(expectedResult, null, 2)
      )
    })

    it('should handle long table and schema names', async () => {
      const tableName = 'a'.repeat(128) // Max identifier length in SQL Server
      const schemaName = 'b'.repeat(128)
      mockRequest.query.mockResolvedValue({ recordset: [] })

      await getTableSchema(mockDb, tableName, schemaName)

      expect(mockRequest.input).toHaveBeenCalledWith('tableName', tableName)
      expect(mockRequest.input).toHaveBeenCalledWith('schemaName', schemaName)
    })
  })

  describe('data type verification', () => {
    it('should preserve all column metadata types', async () => {
      const tableName = 'test_table'
      mockRequest.query.mockResolvedValue({ recordset: mockColumns })

      const result = await getTableSchema(mockDb, tableName)
      const parsedResult = JSON.parse(result.content[0].text as string)

      expect(parsedResult.table).toBe('dbo.test_table')
      expect(parsedResult.columns).toHaveLength(4)

      // Verify first column (primary key)
      const firstColumn = parsedResult.columns[0]
      expect(firstColumn.COLUMN_NAME).toBe('id')
      expect(firstColumn.DATA_TYPE).toBe('int')
      expect(firstColumn.IS_NULLABLE).toBe('NO')
      expect(firstColumn.IS_PRIMARY_KEY).toBe('YES')
      expect(firstColumn.NUMERIC_PRECISION).toBe(10)
      expect(firstColumn.NUMERIC_SCALE).toBe(0)

      // Verify varchar column
      const secondColumn = parsedResult.columns[1]
      expect(secondColumn.COLUMN_NAME).toBe('name')
      expect(secondColumn.DATA_TYPE).toBe('varchar')
      expect(secondColumn.CHARACTER_MAXIMUM_LENGTH).toBe(255)
      expect(secondColumn.IS_PRIMARY_KEY).toBe('NO')

      // Verify nullable column
      const thirdColumn = parsedResult.columns[2]
      expect(thirdColumn.IS_NULLABLE).toBe('YES')

      // Verify column with default value
      const fourthColumn = parsedResult.columns[3]
      expect(fourthColumn.COLUMN_DEFAULT).toBe('getdate()')
    })
  })
})
