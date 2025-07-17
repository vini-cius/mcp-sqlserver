import { z } from 'zod'

export const executeQueryInput = z.object({
  query: z.string().describe('SQL query to execute'),
  parameters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe('Query parameters (optional)'),
})

export const getTableSchemaInput = z.object({
  tableName: z.string().describe('Name of the table'),
  schemaName: z
    .string()
    .optional()
    .describe('Schema name (default: dbo)')
    .default('dbo'),
})

export const listTablesInput = z.object({
  schemaName: z
    .string()
    .optional()
    .describe('Schema name to filter tables (default: dbo)')
    .default('dbo'),
})

export const getDatabaseInfoInput = z.object({}).strict()

export const listProceduresInput = z.object({
  schemaName: z
    .string()
    .optional()
    .describe('Schema name to filter procedures'),
})

export const listFunctionsInput = z.object({
  schemaName: z.string().optional().describe('Schema name to filter functions'),
  functionType: z
    .enum(['SCALAR', 'TABLE'])
    .optional()
    .describe('Type of function to filter'),
})

export const getProcedureSchemaInput = z.object({
  procedureName: z.string().describe('Name of the stored procedure'),
  schemaName: z.string().default('dbo').describe('Schema name (default: dbo)'),
})

export const getFunctionSchemaInput = z.object({
  functionName: z.string().describe('Name of the function'),
  schemaName: z.string().default('dbo').describe('Schema name (default: dbo)'),
})

export const executeProcedureInput = z.object({
  procedureName: z.string().describe('Name of the stored procedure to execute'),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Procedure parameters'),
  schemaName: z.string().default('dbo').describe('Schema name (default: dbo)'),
})

export const toolsSchemas = {
  execute_query: executeQueryInput,
  get_table_schema: getTableSchemaInput,
  list_tables: listTablesInput,
  get_database_info: getDatabaseInfoInput,
  list_procedures: listProceduresInput,
  list_functions: listFunctionsInput,
  get_procedure_schema: getProcedureSchemaInput,
  get_function_schema: getFunctionSchemaInput,
  execute_procedure: executeProcedureInput,
} as const

export type ExecuteQueryInput = z.infer<typeof executeQueryInput>
export type GetTableSchemaInput = z.infer<typeof getTableSchemaInput>
export type ListTablesInput = z.infer<typeof listTablesInput>
export type GetDatabaseInfoInput = z.infer<typeof getDatabaseInfoInput>
export type ListProceduresInput = z.infer<typeof listProceduresInput>
export type ListFunctionsInput = z.infer<typeof listFunctionsInput>
export type GetProcedureSchemaInput = z.infer<typeof getProcedureSchemaInput>
export type GetFunctionSchemaInput = z.infer<typeof getFunctionSchemaInput>
export type ExecuteProcedureInput = z.infer<typeof executeProcedureInput>
