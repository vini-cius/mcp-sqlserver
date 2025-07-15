import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'

export async function listTables(
  db: DatabaseConnection,
  schemaName?: string
): Promise<CallToolResult> {
  try {
    const pool = db.getPool()

    let query = `
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
    `.trim()

    const request = pool.request()

    if (schemaName) {
      query += ' AND TABLE_SCHEMA = @schemaName'
      request.input('schemaName', schemaName)
    }

    query += ' ORDER BY TABLE_SCHEMA, TABLE_NAME'

    const result = await request.query(query)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tables: result.recordset,
              count: result.recordset.length,
            },
            null,
            2
          ),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        },
      ],
      isError: true,
    }
  }
}
