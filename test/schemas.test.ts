import {
  executeQueryInput,
  getDatabaseInfoInput,
  getTableSchemaInput,
  listTablesInput,
} from '../src/schemas'

describe('Zod schema validation', () => {
  describe('execute_query', () => {
    it('should accept a valid input', () => {
      const result = executeQueryInput.safeParse({
        query: 'SELECT * FROM users',
        parameters: {
          id: 1,
          name: 'João',
          isActive: true,
        },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid parameter type', () => {
      const result = executeQueryInput.safeParse({
        query: 'SELECT * FROM users',
        parameters: {
          invalid: { nested: true },
        },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('get_table_schema', () => {
    it('should require tableName', () => {
      const result = getTableSchemaInput.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should default schemaName to dbo', () => {
      const result = getTableSchemaInput.parse({ tableName: 'users' })
      expect(result.schemaName).toBe('dbo')
    })
  })

  describe('list_tables', () => {
    it('should accept empty input', () => {
      const result = listTablesInput.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept schemaName string', () => {
      const result = listTablesInput.safeParse({ schemaName: 'public' })
      expect(result.success).toBe(true)
    })
  })

  describe('get_database_info', () => {
    it('should accept empty object', () => {
      const result = getDatabaseInfoInput.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject non-empty input', () => {
      const result = getDatabaseInfoInput.safeParse({ extra: 'nope' })
      expect(result.success).toBe(false)
    })
  })
})
