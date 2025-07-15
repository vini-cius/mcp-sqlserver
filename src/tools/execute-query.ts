import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'
import { sanitizeParameters } from '../utils/sanitize-parameters'
import { validateQuery } from '../utils/validate-query'

export async function executeQuery(
  db: DatabaseConnection,
  query: string,
  parameters?: Record<string, unknown>
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

    if (!validateQuery(query)) {
      throw new Error('Potentially destructive command blocked.')
    }

    const result = await request.query(query)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.recordset, null, 2),
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
