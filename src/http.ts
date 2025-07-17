import fastifyCors from '@fastify/cors'
import { fastify } from 'fastify'

import { env } from './env'
import { registerMcpRoutes } from './routes/mcp'

const app = fastify({ logger: true })

app.register(fastifyCors, {
  origin:
    process.env.NODE_ENV === 'production' && env.ORIGIN
      ? env.ORIGIN.split(',')
      : '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
})

registerMcpRoutes(app)

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.HTTP_PORT, host: '0.0.0.0' })

    app.log.info('Servidor MCP iniciado na porta 3333')
  } catch (err) {
    app.log.error(err)

    process.exit(1)
  }
}

start()

process.on('SIGINT', async () => {
  await app.close()
  process.exit(0)
})
