import { validateQuery } from '../../src/utils/validate-query'

describe('validateQuery', () => {
  describe('Valid queries', () => {
    describe('SELECT queries', () => {
      it('should allow basic SELECT queries', () => {
        expect(validateQuery('SELECT * FROM users')).toBe(true)
        expect(validateQuery('SELECT id, name FROM products')).toBe(true)
        expect(validateQuery('SELECT COUNT(*) FROM orders')).toBe(true)
      })

      it('should allow SELECT with WHERE clause', () => {
        expect(validateQuery('SELECT * FROM users WHERE id = 1')).toBe(true)
        expect(
          validateQuery('SELECT name FROM products WHERE price > 100')
        ).toBe(true)
      })

      it('should allow SELECT with JOINs', () => {
        expect(
          validateQuery(
            'SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id'
          )
        ).toBe(true)
      })

      it('should allow SELECT with ORDER BY and LIMIT', () => {
        expect(validateQuery('SELECT * FROM users ORDER BY name ASC')).toBe(
          true
        )
        expect(validateQuery('SELECT TOP 10 * FROM products')).toBe(true)
      })

      it('should handle case insensitive SELECT', () => {
        expect(validateQuery('select * from users')).toBe(true)
        expect(validateQuery('Select Id From Products')).toBe(true)
      })

      it('should handle queries with extra whitespace', () => {
        expect(validateQuery('  SELECT * FROM users  ')).toBe(true)
        expect(validateQuery('\n\tSELECT id FROM products\n')).toBe(true)
      })
    })

    describe('WITH queries', () => {
      it('should allow WITH (CTE) queries', () => {
        expect(
          validateQuery('WITH cte AS (SELECT * FROM users) SELECT * FROM cte')
        ).toBe(true)
      })
    })

    describe('SHOW queries', () => {
      it('should allow SHOW queries', () => {
        expect(validateQuery('SHOW TABLES')).toBe(true)
        expect(validateQuery('SHOW DATABASES')).toBe(true)
      })
    })

    describe('DESCRIBE queries', () => {
      it('should allow DESCRIBE queries', () => {
        expect(validateQuery('DESCRIBE users')).toBe(true)
      })
    })

    describe('EXPLAIN queries', () => {
      it('should allow EXPLAIN queries', () => {
        expect(validateQuery('EXPLAIN SELECT * FROM users')).toBe(true)
        expect(validateQuery('EXPLAIN PLAN FOR SELECT * FROM products')).toBe(
          true
        )
      })
    })

    describe('EXEC/EXECUTE queries', () => {
      it('should allow EXEC with simple procedure names', () => {
        expect(validateQuery('EXEC GetUserById')).toBe(true)
        expect(validateQuery('EXECUTE GetUserById')).toBe(true)
      })

      it('should allow EXEC with schema-qualified procedures', () => {
        expect(validateQuery('EXEC dbo.GetUserById')).toBe(true)
        expect(validateQuery('EXECUTE schema.ProcedureName')).toBe(true)
      })

      it('should allow EXEC with parameters', () => {
        expect(validateQuery('EXEC GetUserById(1)')).toBe(true)
        expect(
          validateQuery("EXECUTE GetUserById(@id = 1, @name = 'test')")
        ).toBe(true)
      })

      it('should allow EXEC with complex parameters', () => {
        expect(
          validateQuery(
            "EXEC GetUsers(@startDate = '2023-01-01', @endDate = '2023-12-31')"
          )
        ).toBe(true)
      })
    })
  })

  describe('Invalid queries', () => {
    describe('Blocked commands', () => {
      it('should block DROP TABLE queries', () => {
        expect(validateQuery('DROP TABLE users')).toBe(false)
        expect(validateQuery('drop table products')).toBe(false)
      })

      it('should block DELETE queries', () => {
        expect(validateQuery('DELETE FROM users')).toBe(false)
        expect(validateQuery('delete from products WHERE id = 1')).toBe(false)
      })

      it('should block TRUNCATE queries', () => {
        expect(validateQuery('TRUNCATE TABLE users')).toBe(false)
        expect(validateQuery('truncate table products')).toBe(false)
      })

      it('should block INSERT queries', () => {
        expect(validateQuery("INSERT INTO users (name) VALUES ('John')")).toBe(
          false
        )
        expect(
          validateQuery("insert into products VALUES (1, 'Product')")
        ).toBe(false)
      })

      it('should block UPDATE queries', () => {
        expect(validateQuery("UPDATE users SET name = 'John'")).toBe(false)
        expect(validateQuery('update products SET price = 100')).toBe(false)
      })

      it('should block CREATE TABLE queries', () => {
        expect(
          validateQuery('CREATE TABLE users (id INT, name VARCHAR(50))')
        ).toBe(false)
        expect(validateQuery('create table products (id int)')).toBe(false)
      })

      it('should block ALTER TABLE queries', () => {
        expect(
          validateQuery('ALTER TABLE users ADD COLUMN email VARCHAR(100)')
        ).toBe(false)
        expect(
          validateQuery('alter table products DROP COLUMN description')
        ).toBe(false)
      })

      it('should block RENAME TABLE queries', () => {
        expect(validateQuery('RENAME TABLE users TO customers')).toBe(false)
        expect(validateQuery('rename table products TO items')).toBe(false)
      })
    })

    describe('System stored procedures', () => {
      it('should block sp_ procedures', () => {
        expect(validateQuery('EXEC sp_helpdb')).toBe(false)
        expect(validateQuery('EXECUTE sp_who')).toBe(false)
      })

      it('should block xp_ procedures', () => {
        expect(validateQuery('EXEC xp_cmdshell')).toBe(false)
        expect(validateQuery('EXECUTE xp_fileexist')).toBe(false)
      })
    })

    describe('SQL injection attempts', () => {
      it('should block queries with semicolon followed by DROP', () => {
        expect(validateQuery('SELECT * FROM users; DROP TABLE users')).toBe(
          false
        )
        expect(validateQuery('SELECT * FROM users ; drop table products')).toBe(
          false
        )
      })

      it('should block queries with semicolon followed by DELETE', () => {
        expect(validateQuery('SELECT * FROM users; DELETE FROM users')).toBe(
          false
        )
        expect(
          validateQuery('SELECT * FROM users ; delete from products')
        ).toBe(false)
      })

      it('should block UNION attacks', () => {
        expect(
          validateQuery('SELECT * FROM users UNION SELECT * FROM passwords')
        ).toBe(false)
        expect(
          validateQuery(
            'SELECT id FROM products union select password FROM users'
          )
        ).toBe(false)
      })

      it('should block queries with SQL comments', () => {
        expect(validateQuery('SELECT * FROM users -- WHERE id = 1')).toBe(false)
        expect(validateQuery('SELECT * FROM users WHERE 1=1 --')).toBe(false)
      })

      it('should block queries with multi-line comments', () => {
        expect(
          validateQuery('SELECT * FROM users /* comment */ WHERE id = 1')
        ).toBe(false)
        expect(
          validateQuery('SELECT * /* malicious comment */ FROM users')
        ).toBe(false)
      })

      it('should block dynamic SQL execution', () => {
        expect(validateQuery("EXEC('SELECT * FROM users')")).toBe(false)
        expect(validateQuery("EXECUTE('DROP TABLE users')")).toBe(false)
      })
    })

    describe('Invalid EXEC/EXECUTE queries', () => {
      it('should block EXEC with invalid procedure names', () => {
        expect(validateQuery('EXEC 123InvalidName')).toBe(false)
        expect(validateQuery('EXECUTE @variable')).toBe(false)
      })

      it('should block EXEC with dynamic SQL', () => {
        expect(validateQuery("EXEC ('SELECT * FROM users')")).toBe(false)
        expect(validateQuery('EXECUTE (@sql)')).toBe(false)
      })

      it('should block EXEC with complex expressions', () => {
        expect(validateQuery("EXEC user.proc + ' malicious code'")).toBe(false)
      })
    })

    describe('Commands not starting with allowed patterns', () => {
      it('should block queries not starting with allowed commands', () => {
        expect(validateQuery('GRANT SELECT ON users TO user1')).toBe(false)
        expect(validateQuery('REVOKE SELECT ON users FROM user1')).toBe(false)
        expect(validateQuery('BACKUP DATABASE test TO disk')).toBe(false)
        expect(validateQuery('RESTORE DATABASE test FROM disk')).toBe(false)
      })

      it('should block empty or whitespace-only queries', () => {
        expect(validateQuery('')).toBe(false)
        expect(validateQuery('   ')).toBe(false)
        expect(validateQuery('\n\t')).toBe(false)
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle mixed case in blocked patterns', () => {
      expect(
        validateQuery('SELECT * FROM users Union Select * FROM passwords')
      ).toBe(false)
      expect(
        validateQuery('SELECT * FROM users UNION select * FROM passwords')
      ).toBe(false)
    })

    it('should handle queries with multiple spaces', () => {
      expect(validateQuery('SELECT    *    FROM    users')).toBe(true)
      expect(validateQuery('DELETE     FROM     users')).toBe(false)
    })

    it('should handle queries with newlines and tabs', () => {
      expect(validateQuery('SELECT *\nFROM users\nWHERE id = 1')).toBe(true)
      expect(validateQuery('DELETE\tFROM\tusers')).toBe(false)
    })

    it('should handle complex valid EXEC patterns', () => {
      expect(validateQuery('EXEC my_schema.my_procedure_name_123')).toBe(true)
      expect(validateQuery('EXECUTE _ValidProcedure')).toBe(true)
    })

    it('should handle EXEC with whitespace variations', () => {
      expect(validateQuery('EXEC   GetUserById   (   1   )')).toBe(true)
      expect(validateQuery('EXECUTE\tGetUserById\t(\t1\t)')).toBe(true)
    })
  })
})
