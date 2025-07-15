import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'

export async function getProcedureSchema(
  db: DatabaseConnection,
  procedureName: string,
  schemaName: string = 'dbo'
): Promise<CallToolResult> {
  try {
    const pool = db.getPool()

    const query = `
      SELECT 
        p.PARAMETER_NAME,
        p.DATA_TYPE,
        p.PARAMETER_MODE,
        p.CHARACTER_MAXIMUM_LENGTH,
        p.NUMERIC_PRECISION,
        p.NUMERIC_SCALE,
        p.ORDINAL_POSITION,
        r.ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.PARAMETERS p
      INNER JOIN INFORMATION_SCHEMA.ROUTINES r 
        ON p.SPECIFIC_NAME = r.SPECIFIC_NAME
      WHERE r.ROUTINE_NAME = @procedureName 
        AND r.ROUTINE_SCHEMA = @schemaName
        AND r.ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY p.ORDINAL_POSITION
    `.trim()

    const request = pool.request()

    request.input('procedureName', procedureName)
    request.input('schemaName', schemaName)

    const result = await request.query(query)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              procedure: `${schemaName}.${procedureName}`,
              parameters: result.recordset.map((row) => ({
                name: row.PARAMETER_NAME,
                dataType: row.DATA_TYPE,
                mode: row.PARAMETER_MODE,
                maxLength: row.CHARACTER_MAXIMUM_LENGTH,
                precision: row.NUMERIC_PRECISION,
                scale: row.NUMERIC_SCALE,
                position: row.ORDINAL_POSITION,
              })),
              definition: result.recordset[0]?.ROUTINE_DEFINITION || null,
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
