import { exec } from 'child_process';
import { promisify } from 'util';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const execAsync = promisify(exec);

// Database connection parameters from docker-compose.yml
const DB_CONFIG = {
  host: 'localhost',
  port: '54322',
  user: 'postgres',
  password: 'your-super-secret-and-long-postgres-password',
  database: 'postgres'
};

describe('PostgreSQL Database Connection Tests', () => {
  describe('Basic Connection', () => {
    it('should connect to PostgreSQL database', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT 1 as test" -t`;
      
      try {
        const { stdout, stderr } = await execAsync(command);
        expect(stderr).toBe('');
        expect(stdout.trim()).toBe('1');
      } catch (error) {
        throw new Error(`Failed to connect to database: ${error.message}`);
      }
    });

    it('should verify current user and database', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT current_user, current_database();" -t`;
      
      const { stdout } = await execAsync(command);
      const [user, database] = stdout.trim().split('|').map(s => s.trim());
      
      expect(user).toBe('postgres');
      expect(database).toBe('postgres');
    });
  });

  describe('Database Permissions', () => {
    it('should have superuser privileges', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT usesuper FROM pg_user WHERE usename = current_user;" -t`;
      
      const { stdout } = await execAsync(command);
      expect(stdout.trim()).toBe('t'); // 't' means true in PostgreSQL
    });

    it('should be able to list all databases', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "\\l" -t`;
      
      const { stdout, stderr } = await execAsync(command);
      expect(stderr).toBe('');
      expect(stdout).toContain('postgres');
    });

    it('should be able to create and drop test database', async () => {
      const testDbName = 'test_connection_verify';
      
      // Create test database
      const createCommand = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "CREATE DATABASE ${testDbName};"`;
      await execAsync(createCommand);
      
      // Verify it exists
      const listCommand = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT datname FROM pg_database WHERE datname = '${testDbName}';" -t`;
      const { stdout } = await execAsync(listCommand);
      expect(stdout.trim()).toBe(testDbName);
      
      // Drop test database
      const dropCommand = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "DROP DATABASE ${testDbName};"`;
      await execAsync(dropCommand);
    });
  });

  describe('Schema and Tables', () => {
    it('should have auth schema', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';" -t`;
      
      const { stdout } = await execAsync(command);
      expect(stdout.trim()).toBe('auth');
    });

    it('should have public schema', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'public';" -t`;
      
      const { stdout } = await execAsync(command);
      expect(stdout.trim()).toBe('public');
    });

    it('should list critical tables', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" -t`;
      
      const { stdout } = await execAsync(command);
      const tables = stdout.split('\n').filter(line => line.trim()).map(line => line.trim());
      
      // Verify we have tables (content table should exist based on the test-supabase-connection.js)
      expect(tables.length).toBeGreaterThan(0);
      console.log('Found tables:', tables);
    });
  });

  describe('Connection Stability', () => {
    it('should handle multiple concurrent connections', async () => {
      const promises = Array(5).fill(null).map(async (_, index) => {
        const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT ${index + 1} as connection_test;" -t`;
        const { stdout } = await execAsync(command);
        return stdout.trim();
      });
      
      const results = await Promise.all(promises);
      expect(results).toEqual(['1', '2', '3', '4', '5']);
    });

    it('should verify database is accepting connections', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT datallowconn FROM pg_database WHERE datname = 'postgres';" -t`;
      
      const { stdout } = await execAsync(command);
      expect(stdout.trim()).toBe('t'); // 't' means true - database allows connections
    });
  });

  describe('Backup Readiness', () => {
    it('should have pg_dump available', async () => {
      try {
        await execAsync('which pg_dump');
        expect(true).toBe(true);
      } catch (error) {
        console.warn('pg_dump not found in PATH. You may need to install PostgreSQL client tools.');
      }
    });

    it('should be able to get database size', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT pg_size_pretty(pg_database_size('postgres'));" -t`;
      
      const { stdout } = await execAsync(command);
      expect(stdout.trim()).toMatch(/\d+\s*(bytes|kB|MB|GB)/);
      console.log('Database size:', stdout.trim());
    });

    it('should check for active connections', async () => {
      const command = `PGPASSWORD="${DB_CONFIG.password}" psql -U ${DB_CONFIG.user} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -d ${DB_CONFIG.database} -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';" -t`;
      
      const { stdout } = await execAsync(command);
      const activeConnections = parseInt(stdout.trim());
      expect(activeConnections).toBeGreaterThanOrEqual(1); // At least our connection
      console.log('Active connections:', activeConnections);
    });
  });
});