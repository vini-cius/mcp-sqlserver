import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'
import { sanitizeParameters } from '../utils/sanitize-parameters'

export async function executeProcedure(
  db: DatabaseConnection,
  procedureName: string,
  parameters?: Record<string, unknown>,
  schemaName: string = 'dbo'
): Promise<CallToolResult> {
  try {
    const pool = db.getPool()
    const request = pool.request()

    if (parameters) {
      const sanitizedParams = sanitizeParameters(parameters)

      for (const [key, value] of Object.entries(sanitizedParams)) {
        request.input(key, value)
      }
    }

    const result = await request.execute(`${schemaName}.${procedureName}`)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              procedure: `${schemaName}.${procedureName}`,
              recordsets: result.recordsets,
              recordset: result.recordset,
              output: result.output || {},
              returnValue: result.returnValue,
              rowsAffected: result.rowsAffected,
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
