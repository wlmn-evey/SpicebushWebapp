import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Client } = pg;

// Read-only user credentials
const READONLY_CONFIG = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'spicebush_readonly',
  password: '6afRf15M187YKF88UpWYJsn4zijsNiQMZmQVOK9Rdyw='
};

// Admin user for comparison/setup
const ADMIN_CONFIG = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password'
};

describe('Read-Only User with pg Client Library', () => {
  let readonlyClient;
  let adminClient;

  beforeAll(async () => {
    // Set up admin client for test data
    adminClient = new Client(ADMIN_CONFIG);
    await adminClient.connect();
    
    // Ensure we have some test data
    await adminClient.query(`
      INSERT INTO content (slug, type, title, status, data, created_at)
      VALUES 
        ('test-readonly-1', 'test', 'Test Entry 1', 'published', '{"body": "Test content 1"}', NOW()),
        ('test-readonly-2', 'test', 'Test Entry 2', 'draft', '{"body": "Test content 2"}', NOW())
      ON CONFLICT (slug) DO NOTHING
    `);
    
    await adminClient.query(`
      INSERT INTO settings (key, value, created_at, updated_at)
      VALUES 
        ('test-setting-1', '"test-value-1"', NOW(), NOW()),
        ('test-setting-2', '{"complex": "value"}', NOW(), NOW())
      ON CONFLICT (key) DO NOTHING
    `);
  });

  afterAll(async () => {
    // Clean up test data
    if (adminClient) {
      await adminClient.query(`DELETE FROM content WHERE type = 'test'`);
      await adminClient.query(`DELETE FROM settings WHERE key LIKE 'test-setting-%'`);
      await adminClient.end();
    }
    
    if (readonlyClient) {
      await readonlyClient.end();
    }
  });

  describe('Connection Management', () => {
    it('should connect successfully with read-only credentials', async () => {
      readonlyClient = new Client(READONLY_CONFIG);
      await expect(readonlyClient.connect()).resolves.not.toThrow();
      
      const result = await readonlyClient.query('SELECT current_user');
      expect(result.rows[0].current_user).toBe('spicebush_readonly');
    });

    it('should handle connection pooling scenarios', async () => {
      // Create multiple clients to test connection limit
      const clients = [];
      
      try {
        // Create 5 clients (well under the limit of 10)
        for (let i = 0; i < 5; i++) {
          const client = new Client(READONLY_CONFIG);
          await client.connect();
          clients.push(client);
          
          // Verify each can query
          const result = await client.query('SELECT $1::int as client_num', [i]);
          expect(result.rows[0].client_num).toBe(i);
        }
        
        // All 5 should work fine
        expect(clients).toHaveLength(5);
        
      } finally {
        // Clean up all clients
        for (const client of clients) {
          await client.end();
        }
      }
    });

    it('should properly release connections', async () => {
      const client = new Client(READONLY_CONFIG);
      await client.connect();
      
      // Run a query
      await client.query('SELECT 1');
      
      // End connection
      await client.end();
      
      // Verify we can't query after ending
      await expect(client.query('SELECT 1')).rejects.toThrow();
    });
  });

  describe('Read Operations', () => {
    it('should read from content table with various queries', async () => {
      // Simple select
      const result1 = await readonlyClient.query('SELECT * FROM content WHERE type = $1', ['test']);
      expect(result1.rows.length).toBeGreaterThanOrEqual(2);
      
      // Select with specific columns
      const result2 = await readonlyClient.query(
        'SELECT slug, title, status FROM content WHERE slug = $1',
        ['test-readonly-1']
      );
      expect(result2.rows[0]).toEqual({
        slug: 'test-readonly-1',
        title: 'Test Entry 1',
        status: 'published'
      });
      
      // Complex query with JSON operations
      const result3 = await readonlyClient.query(
        `SELECT slug, data->>'body' as body FROM content WHERE type = $1 AND status = $2`,
        ['test', 'published']
      );
      expect(result3.rows[0].body).toBe('Test content 1');
    });

    it('should read from settings table', async () => {
      const result = await readonlyClient.query(
        'SELECT key, value FROM settings WHERE key = $1',
        ['test-setting-1']
      );
      expect(result.rows[0]).toEqual({
        key: 'test-setting-1',
        value: 'test-value-1'
      });
    });

    it('should handle prepared statements', async () => {
      const query = {
        name: 'fetch-content-by-slug',
        text: 'SELECT * FROM content WHERE slug = $1',
        values: ['test-readonly-1']
      };
      
      const result = await readonlyClient.query(query);
      expect(result.rows[0].slug).toBe('test-readonly-1');
      
      // Execute the same prepared statement again
      query.values = ['test-readonly-2'];
      const result2 = await readonlyClient.query(query);
      expect(result2.rows[0].slug).toBe('test-readonly-2');
    });

    it('should handle transactions for read operations', async () => {
      await readonlyClient.query('BEGIN');
      
      const result1 = await readonlyClient.query('SELECT COUNT(*) FROM content');
      const count1 = parseInt(result1.rows[0].count);
      
      const result2 = await readonlyClient.query('SELECT COUNT(*) FROM settings');
      const count2 = parseInt(result2.rows[0].count);
      
      await readonlyClient.query('COMMIT');
      
      expect(count1).toBeGreaterThanOrEqual(0);
      expect(count2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Write Restrictions with pg Client', () => {
    it('should fail INSERT operations', async () => {
      await expect(
        readonlyClient.query(
          'INSERT INTO content (slug, type, title, status) VALUES ($1, $2, $3, $4)',
          ['test-insert', 'test', 'Test Insert', 'draft']
        )
      ).rejects.toThrow(/permission denied/);
    });

    it('should fail UPDATE operations', async () => {
      await expect(
        readonlyClient.query(
          'UPDATE content SET title = $1 WHERE slug = $2',
          ['Updated Title', 'test-readonly-1']
        )
      ).rejects.toThrow(/permission denied/);
    });

    it('should fail DELETE operations', async () => {
      await expect(
        readonlyClient.query(
          'DELETE FROM content WHERE slug = $1',
          ['test-readonly-1']
        )
      ).rejects.toThrow(/permission denied/);
    });

    it('should fail write transactions', async () => {
      await readonlyClient.query('BEGIN');
      
      const insertPromise = readonlyClient.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2)',
        ['test-fail', '"should-not-work"']
      );
      
      await expect(insertPromise).rejects.toThrow(/permission denied/);
      
      // Rollback the failed transaction
      await readonlyClient.query('ROLLBACK');
      
      // Verify we can still read after failed write
      const result = await readonlyClient.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });
  });

  describe('Performance and Optimization', () => {
    it('should execute queries efficiently', async () => {
      const start = Date.now();
      
      const result = await readonlyClient.query(`
        SELECT c.*, s.value as setting_value
        FROM content c
        LEFT JOIN settings s ON s.key = 'test-setting-1'
        WHERE c.type = $1
        LIMIT 100
      `, ['test']);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.rows).toBeDefined();
    });

    it('should handle cursor-based pagination', async () => {
      await readonlyClient.query('BEGIN');
      
      // Declare cursor
      await readonlyClient.query('DECLARE test_cursor CURSOR FOR SELECT * FROM content ORDER BY created_at');
      
      // Fetch first batch
      const result1 = await readonlyClient.query('FETCH 5 FROM test_cursor');
      const firstBatchCount = result1.rows.length;
      
      // Fetch next batch
      const result2 = await readonlyClient.query('FETCH 5 FROM test_cursor');
      
      // Close cursor and commit
      await readonlyClient.query('CLOSE test_cursor');
      await readonlyClient.query('COMMIT');
      
      expect(firstBatchCount).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for permission denied', async () => {
      try {
        await readonlyClient.query('CREATE TABLE test_table (id serial)');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('permission denied');
        expect(error.code).toBe('42501'); // PostgreSQL error code for insufficient privilege
      }
    });

    it('should handle query timeouts gracefully', async () => {
      // Set a statement timeout
      await readonlyClient.query('SET statement_timeout = 100'); // 100ms
      
      try {
        // This should timeout
        await readonlyClient.query('SELECT pg_sleep(1)');
        expect.fail('Should have timed out');
      } catch (error) {
        expect(error.message).toContain('canceling statement due to statement timeout');
      }
      
      // Reset timeout and verify connection still works
      await readonlyClient.query('SET statement_timeout = 0');
      const result = await readonlyClient.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    it('should handle malformed queries', async () => {
      await expect(
        readonlyClient.query('SELECT * FORM content') // Typo: FORM instead of FROM
      ).rejects.toThrow(/syntax error/);
      
      // Verify connection is still good
      const result = await readonlyClient.query('SELECT 1');
      expect(result.rows[0]['?column?']).toBe(1);
    });
  });

  describe('Security Validation', () => {
    it('should not expose sensitive system information', async () => {
      // Should not access password hashes
      await expect(
        readonlyClient.query('SELECT * FROM pg_authid')
      ).rejects.toThrow(/permission denied/);
      
      // Should not access other users' activity
      const result = await readonlyClient.query(`
        SELECT count(*) as own_connections 
        FROM pg_stat_activity 
        WHERE usename = current_user
      `);
      expect(parseInt(result.rows[0].own_connections)).toBeGreaterThanOrEqual(1);
    });

    it('should not allow privilege escalation', async () => {
      // Cannot grant permissions
      await expect(
        readonlyClient.query('GRANT SELECT ON content TO public')
      ).rejects.toThrow(/must be owner/);
      
      // Cannot create functions
      await expect(
        readonlyClient.query(`
          CREATE FUNCTION test_func() RETURNS void AS $$
          BEGIN
            -- Do nothing
          END;
          $$ LANGUAGE plpgsql;
        `)
      ).rejects.toThrow(/permission denied/);
      
      // Cannot alter user
      await expect(
        readonlyClient.query('ALTER USER spicebush_readonly CREATEDB')
      ).rejects.toThrow(/permission denied/);
    });
  });

  describe('Production Readiness', () => {
    it('should handle connection interruption and recovery', async () => {
      // Create a new client
      const tempClient = new Client(READONLY_CONFIG);
      await tempClient.connect();
      
      // Verify it works
      const result1 = await tempClient.query('SELECT 1 as test');
      expect(result1.rows[0].test).toBe(1);
      
      // Simulate connection issue by ending it
      await tempClient.end();
      
      // Create new connection with same config
      const newClient = new Client(READONLY_CONFIG);
      await newClient.connect();
      
      // Verify new connection works
      const result2 = await newClient.query('SELECT 2 as test');
      expect(result2.rows[0].test).toBe(2);
      
      await newClient.end();
    });

    it('should work with async/await patterns', async () => {
      const operations = [
        readonlyClient.query('SELECT COUNT(*) FROM content'),
        readonlyClient.query('SELECT COUNT(*) FROM settings'),
        readonlyClient.query('SELECT current_database()'),
        readonlyClient.query('SELECT version()')
      ];
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBeGreaterThan(0);
      });
    });

    it('should provide useful debugging information', async () => {
      const result = await readonlyClient.query(`
        SELECT 
          current_user,
          current_database(),
          inet_client_addr(),
          pg_backend_pid()
      `);
      
      const debugInfo = result.rows[0];
      expect(debugInfo.current_user).toBe('spicebush_readonly');
      expect(debugInfo.current_database).toBe('postgres');
      expect(debugInfo.pg_backend_pid).toBeGreaterThan(0);
    });
  });
});