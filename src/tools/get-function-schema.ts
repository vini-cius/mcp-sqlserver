import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import type { DatabaseConnection } from '../database'

export async function getFunctionSchema(
  db: DatabaseConnection,
  functionName: string,
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
        r.ROUTINE_DEFINITION,
        r.DATA_TYPE as RETURN_TYPE,
        CASE 
          WHEN r.DATA_TYPE = 'TABLE' THEN 'TABLE-VALUED'
          ELSE 'SCALAR'
        END AS FUNCTION_TYPE
      FROM INFORMATION_SCHEMA.PARAMETERS p
      INNER JOIN INFORMATION_SCHEMA.ROUTINES r 
        ON p.SPECIFIC_NAME = r.SPECIFIC_NAME
      WHERE r.ROUTINE_NAME = @functionName 
        AND r.ROUTINE_SCHEMA = @schemaName
        AND r.ROUTINE_TYPE = 'FUNCTION'
      ORDER BY p.ORDINAL_POSITION
    `.trim()

    const request = pool.request()

    request.input('functionName', functionName)
    request.input('schemaName', schemaName)

    const result = await request.query(query)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              function: `${schemaName}.${functionName}`,
              functionType: result.recordset[0]?.FUNCTION_TYPE || 'UNKNOWN',
              returnType: result.recordset[0]?.RETURN_TYPE || 'UNKNOWN',
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
