import { randomUUID } from 'node:crypto'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { createDatabaseConfig, DatabaseConnection } from '../database'
import { SqlServerMCPService } from '../services/SqlServerMCPService'
import { transportManager } from '../transports/transportManager'

interface McpRequest extends FastifyRequest {
  headers: {
    'mcp-session-id'?: string
    [key: string]: string | string[] | undefined
  }
}

export function registerMcpRoutes(app: FastifyInstance) {
  app.post('/mcp', async (request: McpRequest, reply: FastifyReply) => {
    const sessionId = request.headers['mcp-session-id']

    let transport = sessionId ? transportManager.get(sessionId) : null

    if (!transport && isInitializeRequest(request.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transportManager.set(newSessionId, transport!)
          app.log.info(`Sessão MCP criada: ${newSessionId}`)
        },
      })

      transport.onclose = () => {
        if (transport!.sessionId) {
          transportManager.delete(transport!.sessionId)
          app.log.info(`Sessão encerrada: ${transport!.sessionId}`)
        }
      }

      const config = createDatabaseConfig()
      const database = new DatabaseConnection(config)
      const sqlService = new SqlServerMCPService(database)

      await sqlService.server.connect(transport)
    }

    if (!transport) {
      reply.status(400).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      })
      return
    }

    await transport.handleRequest(request.raw, reply.raw, request.body)
  })

  const handleSessionRequest = async (
    request: McpRequest,
    reply: FastifyReply
  ) => {
    const sessionId = request.headers['mcp-session-id']
    const transport = sessionId ? transportManager.get(sessionId) : null

    if (!transport) {
      reply.status(400).send({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Invalid or missing session ID',
        },
        id: null,
      })
      return
    }

    await transport.handleRequest(request.raw, reply.raw)
  }

  app.get('/mcp', handleSessionRequest)
  app.delete('/mcp', handleSessionRequest)
}
