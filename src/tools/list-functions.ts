import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'

export async function listFunctions(
  db: DatabaseConnection,
  schemaName?: string,
  functionType?: 'SCALAR' | 'TABLE'
): Promise<CallToolResult> {
  try {
    const pool = db.getPool()

    let query = `
      SELECT 
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        ROUTINE_TYPE,
        DATA_TYPE,
        CREATED,
        LAST_ALTERED,
        CASE 
          WHEN DATA_TYPE = 'TABLE' THEN 'TABLE-VALUED'
          ELSE 'SCALAR'
        END AS FUNCTION_TYPE
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'FUNCTION'
    `.trim()

    const request = pool.request()

    if (schemaName) {
      query += ' AND ROUTINE_SCHEMA = @schemaName'
      request.input('schemaName', schemaName)
    }

    if (functionType) {
      if (functionType === 'SCALAR') {
        query += " AND DATA_TYPE != 'TABLE'"
      } else if (functionType === 'TABLE') {
        query += " AND DATA_TYPE = 'TABLE'"
      }
    }

    query += ' ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME'

    const result = await request.query(query)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              functions: result.recordset,
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
