import { createDatabaseConfig, DatabaseConnection } from './database'
import { SqlServerMCPService } from './services/SqlServerMCPService'

async function main() {
  const config = createDatabaseConfig()
  const database = new DatabaseConnection(config)
  const service = new SqlServerMCPService(database)

  process.on('SIGINT', async () => {
    await service.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await service.stop()
    process.exit(0)
  })

  try {
    await service.startWithStdio()
  } catch (error) {
    console.error('Error starting the service:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
