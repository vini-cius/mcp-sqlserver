import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'

export async function listProcedures(
  db: DatabaseConnection,
  schemaName?: string
): Promise<CallToolResult> {
  try {
    const pool = db.getPool()

    let query = `
      SELECT 
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        ROUTINE_TYPE,
        CREATED,
        LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
    `.trim()

    const request = pool.request()

    if (schemaName) {
      query += ' AND ROUTINE_SCHEMA = @schemaName'
      request.input('schemaName', schemaName)
    }

    query += ' ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME'

    const result = await request.query(query)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              procedures: result.recordset,
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
