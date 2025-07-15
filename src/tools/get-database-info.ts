import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'

export async function getDatabaseInfo(
  db: DatabaseConnection
): Promise<CallToolResult> {
  try {
    const pool = db.getPool()

    const queries = [
      'SELECT DB_NAME() as DatabaseName',
      'SELECT @@VERSION as ServerVersion',
      "SELECT SERVERPROPERTY('Edition') as Edition",
      "SELECT SERVERPROPERTY('ProductLevel') as ProductLevel",
    ]

    const results = await Promise.all(
      queries.map(async (query) => {
        const request = pool.request()
        return await request.query(query)
      })
    )

    const info = {
      database: results[0].recordset[0]?.DatabaseName,
      version: results[1].recordset[0]?.ServerVersion,
      edition: results[2].recordset[0]?.Edition,
      productLevel: results[3].recordset[0]?.ProductLevel,
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2),
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
