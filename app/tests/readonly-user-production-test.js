import { exec } from 'child_process';
import { promisify } from 'util';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const execAsync = promisify(exec);

// Database connection parameters
const DB_CONFIG = {
  host: 'localhost',
  port: '54322',
  database: 'postgres'
};

// Users to test
const ADMIN_USER = {
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password'
};

const READONLY_USER = {
  user: process.env.DB_READONLY_USER || 'spicebush_readonly',
  password: process.env.DB_READONLY_PASSWORD || 'test_readonly_password'
};

// Helper function to execute psql commands
async function executePsql(user, password, command, expectError = false) {
  const fullCommand = `PGPASSWORD="${password}" psql -U ${user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "${command}" -t`;
  
  try {
    const { stdout, stderr } = await execAsync(fullCommand);
    if (!expectError && stderr) {
      throw new Error(`Unexpected stderr: ${stderr}`);
    }
    return { stdout: stdout.trim(), stderr: stderr.trim(), error: null };
  } catch (error) {
    if (!expectError) {
      throw error;
    }
    return { stdout: '', stderr: error.stderr || '', error: error.message };
  }
}

describe('Read-Only Database User Production Tests', () => {
  // First, verify the test environment is set up correctly
  describe('Test Environment Verification', () => {
    it('should connect with admin user', async () => {
      const result = await executePsql(ADMIN_USER.user, ADMIN_USER.password, 'SELECT 1 as test');
      expect(result.stdout).toBe('1');
    });

    it('should have required tables', async () => {
      const result = await executePsql(
        ADMIN_USER.user, 
        ADMIN_USER.password, 
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('content', 'settings') ORDER BY table_name"
      );
      const tables = result.stdout.split('\n').filter(line => line.trim());
      expect(tables).toContain('content');
      expect(tables).toContain('settings');
    });
  });

  describe('Read-Only User Authentication', () => {
    it('should connect with read-only user credentials', async () => {
      const result = await executePsql(READONLY_USER.user, READONLY_USER.password, 'SELECT current_user');
      expect(result.stdout).toBe('spicebush_readonly');
    });

    it('should verify user exists in database', async () => {
      const result = await executePsql(
        ADMIN_USER.user,
        ADMIN_USER.password,
        `SELECT usename, usesuper, usecreatedb FROM pg_user WHERE usename = '${READONLY_USER.user}'`
      );
      const [username, isSuper, canCreateDb] = result.stdout.split('|').map(s => s.trim());
      
      expect(username).toBe('spicebush_readonly');
      expect(isSuper).toBe('f'); // Should NOT be superuser
      expect(canCreateDb).toBe('f'); // Should NOT be able to create databases
    });

    it('should have correct connection limit', async () => {
      const result = await executePsql(
        ADMIN_USER.user,
        ADMIN_USER.password,
        `SELECT rolconnlimit FROM pg_roles WHERE rolname = '${READONLY_USER.user}'`
      );
      expect(result.stdout).toBe('10'); // Connection limit should be 10
    });
  });

  describe('Read Permissions', () => {
    it('should SELECT from content table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        'SELECT COUNT(*) FROM content'
      );
      // Just verify we can execute SELECT without error
      expect(result.error).toBeNull();
      expect(/^\d+$/.test(result.stdout)).toBe(true); // Should return a number
    });

    it('should SELECT from settings table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        'SELECT COUNT(*) FROM settings'
      );
      expect(result.error).toBeNull();
      expect(/^\d+$/.test(result.stdout)).toBe(true);
    });

    it('should read specific columns from content table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT slug, type, status FROM content LIMIT 1"
      );
      // If there's data, verify we can read it; if not, just verify no error
      expect(result.error).toBeNull();
    });

    it('should read complex queries with JOINs and WHERE clauses', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT c.slug, c.type FROM content c WHERE c.status = 'published' ORDER BY c.created_at DESC LIMIT 5"
      );
      expect(result.error).toBeNull();
    });
  });

  describe('Write Restrictions', () => {
    it('should NOT INSERT into content table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "INSERT INTO content (slug, type, title, status) VALUES ('test-readonly', 'test', 'Test', 'draft')",
        true // expect error
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT UPDATE content table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "UPDATE content SET title = 'Modified' WHERE slug = 'any-slug'",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT DELETE from content table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "DELETE FROM content WHERE slug = 'any-slug'",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT INSERT into settings table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "INSERT INTO settings (key, value) VALUES ('test-key', 'test-value')",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT UPDATE settings table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "UPDATE settings SET value = 'modified' WHERE key = 'any-key'",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT DELETE from settings table', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "DELETE FROM settings WHERE key = 'any-key'",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });
  });

  describe('Schema Restrictions', () => {
    it('should NOT CREATE tables', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "CREATE TABLE test_table (id serial primary key)",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT DROP tables', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "DROP TABLE IF EXISTS content",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('must be owner of table');
    });

    it('should NOT ALTER tables', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "ALTER TABLE content ADD COLUMN test_column text",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('must be owner of table');
    });

    it('should NOT CREATE indexes', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "CREATE INDEX test_idx ON content(slug)",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('must be owner of table');
    });
  });

  describe('Database Administration Restrictions', () => {
    it('should NOT CREATE databases', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "CREATE DATABASE test_db",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT CREATE users', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "CREATE USER test_user WITH PASSWORD 'test123'",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });

    it('should NOT GRANT permissions', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "GRANT SELECT ON content TO PUBLIC",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('must be owner of table');
    });

    it('should NOT access pg_authid (sensitive system table)', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT * FROM pg_authid",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('permission denied');
    });
  });

  describe('Connection Security', () => {
    it('should enforce connection limit', async () => {
      // This test attempts to create more than 10 connections
      const connectionPromises = [];
      
      // Try to create 12 connections (2 more than the limit)
      for (let i = 0; i < 12; i++) {
        connectionPromises.push(
          executePsql(
            READONLY_USER.user,
            READONLY_USER.password,
            `SELECT ${i} as connection_id, pg_sleep(2)`, // Hold connection for 2 seconds
            i >= 10 // Expect error for connections 11 and 12
          )
        );
      }

      const results = await Promise.all(connectionPromises);
      
      // First 10 should succeed
      for (let i = 0; i < 10; i++) {
        expect(results[i].error).toBeNull();
      }
      
      // Connections 11 and 12 should fail
      for (let i = 10; i < 12; i++) {
        expect(results[i].error).toBeTruthy();
        expect(results[i].stderr).toContain('too many connections');
      }
    });

    it('should not reveal sensitive connection information', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT * FROM pg_stat_activity WHERE usename != current_user",
        true
      );
      // Should either error or return empty result
      expect(result.stdout === '' || result.error).toBeTruthy();
    });
  });

  describe('Production Query Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT slug, type, title FROM content LIMIT 1000"
      );
      const queryTime = Date.now() - startTime;
      
      expect(result.error).toBeNull();
      expect(queryTime).toBeLessThan(5000); // Query should complete within 5 seconds
    });

    it('should use indexes when available', async () => {
      // First check if there are indexes on the content table
      const indexResult = await executePsql(
        ADMIN_USER.user,
        ADMIN_USER.password,
        "SELECT indexname FROM pg_indexes WHERE tablename = 'content'"
      );
      
      // If indexes exist, verify the read-only user can benefit from them
      if (indexResult.stdout) {
        const explainResult = await executePsql(
          READONLY_USER.user,
          READONLY_USER.password,
          "EXPLAIN SELECT * FROM content WHERE slug = 'test-slug'"
        );
        expect(explainResult.error).toBeNull();
        // The EXPLAIN output should be readable by the user
        expect(explainResult.stdout).toBeTruthy();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid queries gracefully', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT * FROM non_existent_table",
        true
      );
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('does not exist');
    });

    it('should maintain connection after query error', async () => {
      // First, execute an invalid query
      await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT * FROM non_existent_table",
        true
      );
      
      // Then verify we can still execute valid queries
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT 1 as recovery_test"
      );
      expect(result.stdout).toBe('1');
    });
  });

  describe('Compliance and Audit', () => {
    it('should have appropriate user attributes for production', async () => {
      const result = await executePsql(
        ADMIN_USER.user,
        ADMIN_USER.password,
        `SELECT 
          rolcanlogin,
          rolreplication,
          rolbypassrls,
          rolinherit
        FROM pg_roles WHERE rolname = '${READONLY_USER.user}'`
      );
      
      const [canLogin, canReplicate, bypassRLS, inherit] = result.stdout.split('|').map(s => s.trim());
      
      expect(canLogin).toBe('t'); // Should be able to login
      expect(canReplicate).toBe('f'); // Should NOT have replication rights
      expect(bypassRLS).toBe('f'); // Should NOT bypass row-level security
      expect(inherit).toBe('t'); // Should inherit from granted roles
    });

    it('should not have any dangerous default privileges', async () => {
      const result = await executePsql(
        READONLY_USER.user,
        READONLY_USER.password,
        "SELECT has_database_privilege(current_database(), 'CREATE')"
      );
      expect(result.stdout).toBe('f'); // Should not have CREATE privilege on database
    });

    it('should verify password is properly encrypted', async () => {
      // Check that password is stored encrypted (not plain text)
      const result = await executePsql(
        ADMIN_USER.user,
        ADMIN_USER.password,
        `SELECT rolpassword IS NOT NULL AND rolpassword LIKE 'SCRAM-SHA-256%' as is_encrypted 
         FROM pg_authid WHERE rolname = '${READONLY_USER.user}'`
      );
      expect(result.stdout).toBe('t'); // Password should be encrypted
    });
  });
});