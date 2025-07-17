import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

class TransportManager {
  private transports: Map<
    string,
    { transport: StreamableHTTPServerTransport; createdAt: number }
  > = new Map()
  private TTL = 15 * 60 * 1000

  get(sessionId: string): StreamableHTTPServerTransport | undefined {
    const record = this.transports.get(sessionId)
    if (record && Date.now() - record.createdAt < this.TTL) {
      return record.transport
    }
    this.transports.delete(sessionId)
    return undefined
  }

  set(sessionId: string, transport: StreamableHTTPServerTransport) {
    this.transports.set(sessionId, { transport, createdAt: Date.now() })
  }

  delete(sessionId: string) {
    this.transports.delete(sessionId)
  }

  cleanup() {
    const now = Date.now()
    for (const [id, { createdAt }] of this.transports.entries()) {
      if (now - createdAt >= this.TTL) {
        this.transports.delete(id)
      }
    }
  }
}

export const transportManager = new TransportManager()

setInterval(() => transportManager.cleanup(), 5 * 60 * 1000)
