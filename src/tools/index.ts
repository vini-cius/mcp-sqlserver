import zodToJsonSchema from 'zod-to-json-schema'

import {
  executeProcedureInput,
  executeQueryInput,
  getDatabaseInfoInput,
  getFunctionSchemaInput,
  getProcedureSchemaInput,
  getTableSchemaInput,
  listFunctionsInput,
  listProceduresInput,
  listTablesInput,
} from '../schemas'

export { executeProcedure } from './execute-procedure'
export { executeQuery } from './execute-query'
export { getDatabaseInfo } from './get-database-info'
export { getFunctionSchema } from './get-function-schema'
export { getProcedureSchema } from './get-procedure-schema'
export { getTableSchema } from './get-table-schema'
export { listFunctions } from './list-functions'
export { listProcedures } from './list-procedures'
export { listTables } from './list-tables'

export function toolsList() {
  return [
    {
      name: 'execute_query',
      description: 'Executes a SQL query in SQL Server',
      inputSchema: zodToJsonSchema(executeQueryInput),
    },
    {
      name: 'get_table_schema',
      description: 'Gets the schema of a specific table',
      inputSchema: zodToJsonSchema(getTableSchemaInput),
    },
    {
      name: 'list_tables',
      description: 'Lists all the tables in the database',
      inputSchema: zodToJsonSchema(listTablesInput),
    },
    {
      name: 'get_database_info',
      description: 'Gets general information from the database',
      inputSchema: zodToJsonSchema(getDatabaseInfoInput),
    },
    {
      name: 'list_procedures',
      description: 'Lists all stored procedures in the database',
      inputSchema: zodToJsonSchema(listProceduresInput),
    },
    {
      name: 'list_functions',
      description:
        'Lists all functions (scalar and table-valued) in the database',
      inputSchema: zodToJsonSchema(listFunctionsInput),
    },
    {
      name: 'get_procedure_schema',
      description:
        'Gets the schema and parameters of a specific stored procedure',
      inputSchema: zodToJsonSchema(getProcedureSchemaInput),
    },
    {
      name: 'get_function_schema',
      description: 'Gets the schema and parameters of a specific function',
      inputSchema: zodToJsonSchema(getFunctionSchemaInput),
    },
    {
      name: 'execute_procedure',
      description: 'Executes a stored procedure with parameters',
      inputSchema: zodToJsonSchema(executeProcedureInput),
    },
  ]
}
