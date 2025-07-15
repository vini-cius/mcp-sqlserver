import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'

export async function getTableSchema(
  db: DatabaseConnection,
  tableName: string,
  schemaName: string = 'dbo'
): Promise<CallToolResult> {
  try {
    const pool = db.getPool()

    const query = `
      SELECT 
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.NUMERIC_PRECISION,
        c.NUMERIC_SCALE,
        CASE 
          WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END AS IS_PRIMARY_KEY
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN (
        SELECT ku.TABLE_NAME, ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
      WHERE c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @schemaName
      ORDER BY c.ORDINAL_POSITION
    `

    const request = pool.request()

    request.input('tableName', tableName)
    request.input('schemaName', schemaName)

    const result = await request.query(query)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              table: `${schemaName}.${tableName}`,
              columns: result.recordset,
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
