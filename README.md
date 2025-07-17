# SQL Server MCP Service

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)

A secure and robust Model Context Protocol (MCP) service for executing SQL Server queries via MCP protocol. This service provides a safe way to interact with SQL Server databases while preventing destructive operations and SQL injection attacks.

## 🚀 Features

- **🔒 Secure Query Execution**: Built-in protection against SQL injection and destructive operations
- **📊 Schema Discovery**: Get table, function, and procedure schemas and database information
- **🛠️ Multiple Tools**: 9 specialized tools for different database operations
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

### 5. `list_procedures`
Lists all stored procedures in the database, optionally filtered by schema.

**Parameters:**
- `schemaName` (string, optional): Filter procedures by schema

**Example:**
```json
{
  "schemaName": "dbo"
}
```

### 6. `list_functions`
Lists all functions (scalar and table-valued) in the database, optionally filtered by schema and function type.

**Parameters:**
- `schemaName` (string, optional): Filter functions by schema
- `functionType` (string, optional): 'SCALAR' or 'TABLE'

**Example:**
```json
{
  "schemaName": "dbo",
  "functionType": "SCALAR"
}
```

### 7. `get_procedure_schema`
Gets the schema and parameters of a specific stored procedure.

**Parameters:**
- `procedureName` (string, required): Name of the procedure
- `schemaName` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "procedureName": "MyProcedure",
  "schemaName": "dbo"
}
```

### 8. `get_function_schema`
Gets the schema and parameters of a specific function.

**Parameters:**
- `functionName` (string, required): Name of the function
- `schemaName` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "functionName": "MyFunction",
  "schemaName": "dbo"
}
```

### 9. `execute_procedure`
Executes a stored procedure with parameters.

**Parameters:**
- `procedureName` (string, required): Name of the procedure
- `parameters` (object, optional): Procedure parameters
- `schemaName` (string, optional): Schema name (default: "dbo")

**Example:**
```json
{
  "procedureName": "MyProcedure",
  "parameters": {
    "param1": 123,
    "param2": "abc"
  },
  "schemaName": "dbo"
}
```

## 📦 Installation

### Prerequisites
- Node.js >= 20.0.0
- SQL Server instance
- pnpm (recommended)

### Install Dependencies
```bash
pnpm install
```

## ⚙️ Configuration

1. **Copy Environment Template**
```bash
cp .env.example .env
```

2. **Configure Environment Variables**

| Variable         | Description                                 | Default                      |
|------------------|---------------------------------------------|------------------------------|
| `HTTP_PORT`      | HTTP server port                            | `3333`                       |
| `NODE_ENV`       | Node environment (`development`/`production`)| `development`                |
| `ORIGIN`         | Allowed CORS origins (comma-separated)      | -                            |
| `SQL_SERVER`     | SQL Server hostname/IP                      | `localhost`                  |
| `SQL_DATABASE`   | Database name                               | `master`                     |
| `SQL_USER`       | Database username                           | -                            |
| `SQL_PASSWORD`   | Database password                           | -                            |
| `SQL_PORT`       | SQL Server port                             | `1433`                       |
| `SQL_ENCRYPT`    | Enable encryption                           | `true`                       |
| `SQL_TRUST_CERT` | Trust server certificate                    | `false`                      |

**Example .env:**
```env
HTTP_PORT=3333
NODE_ENV=development
ORIGIN=http://localhost:3000,http://example.com
SQL_SERVER=localhost
SQL_DATABASE=master
SQL_USER=sa
SQL_PASSWORD=YourSecurePassword123!
SQL_PORT=1433
SQL_ENCRYPT=true
SQL_TRUST_CERT=false
```

## 🚀 Usage

### Start HTTP Server (Recommended)
```bash
pnpm run dev:http
# or
pnpm run start:http
```

### Build for Production
```bash
pnpm run build
```

### Running Tests
```bash
pnpm run test
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
- ✅ Safe `EXEC`/`EXECUTE` for procedures/functions

### Parameter Sanitization
All query and procedure parameters are automatically sanitized to prevent injection attacks.

## 🧪 Testing

The project includes comprehensive tests for schema validation and core functionality:

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test -- --watch

# Run tests with coverage
pnpm run test -- --coverage
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Vinicius de Souza Santos**
- Email: viniciuskt0@gmail.com
- GitHub: [@vini-cius](https://github.com/vini-cius)

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [mssql](https://github.com/tediousjs/node-mssql) for SQL Server connectivity
- [Zod](https://zod.dev/) for runtime type validation

---

**⭐ If this project helps you, please give it a star!**
