# SQL Server MCP Service

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.18.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/sqlserver-mcp-service.svg)](https://www.npmjs.com/package/sqlserver-mcp-service)

A secure and robust Model Context Protocol (MCP) service for executing SQL Server queries through a standardized interface. This service provides a safe way to interact with SQL Server databases while preventing destructive operations and SQL injection attacks.

## 🚀 Features

- **🔒 Secure Query Execution**: Built-in protection against SQL injection and destructive operations
- **📊 Schema Discovery**: Get table schemas and database information
- **🛠️ Multiple Tools**: Four specialized tools for different database operations
- **⚡ High Performance**: Connection pooling for efficient database operations
- **🔧 TypeScript Support**: Full TypeScript implementation with type safety
- **🧪 Comprehensive Testing**: Jest-based test suite for reliability

## 🛠️ Available Tools

### 1. `execute_query`
Executes safe SQL queries with parameter support.

**Parameters:**
- `query` (string, required): The SQL query to execute
- `parameters` (object, optional): Query parameters for prepared statements

**Example:**
```json
{
  "query": "SELECT * FROM Users WHERE Status = @status",
  "parameters": {
    "status": "active"
  }
}
```

### 2. `get_table_schema`
Retrieves detailed column information for a specific table.

**Parameters:**
- `tableName` (string, required): Name of the table
- `schemaName` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "tableName": "Users",
  "schemaName": "dbo"
}
```

### 3. `list_tables`
Lists all tables in the database with optional schema filtering.

**Parameters:**
- `schemaName` (string, optional): Filter tables by specific schema

**Example:**
```json
{
  "schemaName": "dbo"
}
```

### 4. `get_database_info`
Retrieves general database information (name, version, edition, etc.).

**Parameters:** None

## 📦 Installation

### Prerequisites
- Node.js >= 18.18.0
- SQL Server instance
- npm or pnpm

### Install Dependencies
```bash
npm install
# or
pnpm install
```

## ⚙️ Configuration

1. **Copy Environment Template**
```bash
cp .env.example .env
```

2. **Configure Database Connection**
```env
SQL_SERVER=localhost
SQL_DATABASE=master
SQL_USER=sa
SQL_PASSWORD=YourSecurePassword123!
SQL_PORT=1433
SQL_ENCRYPT=true
SQL_TRUST_CERT=false
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SQL_SERVER` | SQL Server hostname/IP | `localhost` |
| `SQL_DATABASE` | Database name | `master` |
| `SQL_USER` | Database username | `sa` |
| `SQL_PASSWORD` | Database password | - |
| `SQL_PORT` | SQL Server port | `1433` |
| `SQL_ENCRYPT` | Enable encryption | `true` |
| `SQL_TRUST_CERT` | Trust server certificate | `false` |

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Running Tests
```bash
npm test
```

## 🔒 Security Features

### Query Validation
The service automatically blocks potentially destructive operations:

- ❌ `DROP TABLE`
- ❌ `DELETE FROM`
- ❌ `TRUNCATE TABLE`
- ❌ `INSERT INTO`
- ❌ `UPDATE`
- ❌ `CREATE TABLE`
- ❌ `ALTER TABLE`
- ❌ Stored procedures (`sp_`, `xp_`)
- ❌ SQL injection patterns
- ❌ Comments (`--`, `/* */`)

### Allowed Operations
- ✅ `SELECT` queries
- ✅ `WITH` clauses (CTEs)
- ✅ `SHOW` commands
- ✅ `DESCRIBE` commands
- ✅ `EXPLAIN` commands

### Parameter Sanitization
All query parameters are automatically sanitized to prevent injection attacks.

## 📁 Project Structure

```
mcp-sqlserver/
├── src/
│   ├── index.ts          # Main service implementation
│   ├── schemas.ts        # Zod schemas for validation
│   └── tools.ts          # Tool definitions
├── test/
│   └── schemas.test.ts   # Test suite
├── dist/                 # Compiled JavaScript
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
├── tsup.config.ts        # Build configuration
├── jest.config.mjs       # Test configuration
└── README.md            # This file
```

## 🧪 Testing

The project includes comprehensive tests for schema validation and core functionality:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run the test suite**
   ```bash
   npm test
   ```
6. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
7. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Add JSDoc comments for public methods
- Ensure all tests pass
- Follow the existing code style
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Vinicius de Souza Santos**
- Email: viniciuskt0@gmail.com
- GitHub: [@your-username](https://github.com/your-username)

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [mssql](https://github.com/tediousjs/node-mssql) for SQL Server connectivity
- [Zod](https://zod.dev/) for runtime type validation
- [Fastify](https://fastify.io/) for the web framework

## 📊 Project Status

![GitHub last commit](https://img.shields.io/github/last-commit/vini-cius/nlw-agents-web)
![GitHub issues](https://img.shields.io/github/issues/your-username/mcp-sqlserver)
![GitHub pull requests](https://img.shields.io/github/issues-pr/your-username/mcp-sqlserver)

---

**⭐ If this project helps you, please give it a star!**
