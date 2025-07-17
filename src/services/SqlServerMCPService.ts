import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { DatabaseConnection } from '../database'
import type {
  ExecuteProcedureInput,
  ExecuteQueryInput,
  GetFunctionSchemaInput,
  GetProcedureSchemaInput,
  GetTableSchemaInput,
  ListFunctionsInput,
  ListProceduresInput,
  ListTablesInput,
} from '../schemas'
import { toolsSchemas } from '../schemas'
import {
  executeProcedure,
  executeQuery,
  getDatabaseInfo,
  getFunctionSchema,
  getProcedureSchema,
  getTableSchema,
  listFunctions,
  listProcedures,
  listTables,
  toolsList,
} from '../tools'

export type ToolName = keyof typeof toolsSchemas

export type ToolHandler = (
  database: DatabaseConnection,
  args: Record<string, unknown>
) => Promise<CallToolResult>

export class SqlServerMCPService {
  public server: Server
  private database: DatabaseConnection
  private toolHandlers: Map<string, ToolHandler>
  private availableTools = toolsList()

  constructor(database: DatabaseConnection) {
    this.database = database
    this.toolHandlers = this.createHandlerMap()

    this.server = new Server(
      {
        name: 'sqlserver-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setupToolHandlers()
  }

  private createHandlerMap(): Map<string, ToolHandler> {
    const handlers = new Map<string, ToolHandler>()

    handlers.set('get_database_info', async (database) =>
      getDatabaseInfo(database)
    )

    handlers.set('execute_query', async (database, args) => {
      const { query, parameters } = args as ExecuteQueryInput
      return await executeQuery(database, query, parameters ?? {})
    })

    handlers.set('execute_procedure', async (database, args) => {
      const { procedureName, parameters } = args as ExecuteProcedureInput
      return await executeProcedure(database, procedureName, parameters ?? {})
    })

    handlers.set('get_table_schema', async (database, args) => {
      const { tableName, schemaName } = args as GetTableSchemaInput
      return await getTableSchema(database, tableName, schemaName)
    })

    handlers.set('get_procedure_schema', async (database, args) => {
      const { procedureName, schemaName } = args as GetProcedureSchemaInput
      return await getProcedureSchema(database, procedureName, schemaName)
    })

    handlers.set('get_function_schema', async (database, args) => {
      const { functionName, schemaName } = args as GetFunctionSchemaInput
      return await getFunctionSchema(database, functionName, schemaName)
    })

    handlers.set('list_tables', async (database, args) => {
      const { schemaName } = args as ListTablesInput
      return await listTables(database, schemaName)
    })

    handlers.set('list_functions', async (database, args) => {
      const { schemaName, functionType } = args as ListFunctionsInput
      return await listFunctions(database, schemaName, functionType)
    })

    handlers.set('list_procedures', async (database, args) => {
      const { schemaName } = args as ListProceduresInput
      return await listProcedures(database, schemaName)
    })

    return handlers
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.availableTools }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const baseSchema = z.object({
          name: z.string(),
          arguments: z.record(z.string(), z.any()),
        })

        const { name, arguments: args } = baseSchema.parse(request.params)

        const inputSchema = toolsSchemas[name as ToolName]

        if (!inputSchema) throw new Error(`Unknown tool: ${name}`)

        const parsedArgs = inputSchema.parse(args)

        if (!this.database.isConnected()) await this.database.connect()

        const handler = this.toolHandlers.get(name)

        if (!handler) throw new Error(`Handler not found: ${name}`)

        const TIMEOUT_MS = 30_000

        const result = await Promise.race([
          handler(this.database, parsedArgs),
          new Promise<CallToolResult>((_, reject) =>
            setTimeout(
              () => reject(new Error('Operation timed out')),
              TIMEOUT_MS
            )
          ),
        ])

        return result
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        }
      }
    })
  }

  public registerHandler(name: string, handler: ToolHandler): void {
    this.toolHandlers.set(name, handler)
  }

  public async startWithStdio(): Promise<void> {
    const { StdioServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/stdio.js'
    )

    const transport = new StdioServerTransport()

    await this.server.connect(transport)
  }

  public async stop(): Promise<void> {
    await this.database.disconnect()
  }
}
