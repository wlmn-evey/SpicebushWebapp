import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { logError } from '@lib/error-logger';
import { getNetlifyDatabaseUrl } from './env';

let sharedPool: Pool | null = null;

const createPool = (): Pool => {
  const connectionString = getNetlifyDatabaseUrl();

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
};

export function getPool(): Pool {
  if (!sharedPool) {
    sharedPool = createPool();
  }
  return sharedPool;
}

export async function query<Row extends QueryResultRow = Record<string, unknown>>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<Row>> {
  try {
    return await getPool().query<Row>(text, values);
  } catch (error) {
    logError('db.client', error, { action: 'query' });
    throw error;
  }
}

export async function queryRows<Row extends QueryResultRow = Record<string, unknown>>(
  text: string,
  values: unknown[] = []
): Promise<Row[]> {
  const result = await query<Row>(text, values);
  return result.rows;
}

export async function queryFirst<Row extends QueryResultRow = Record<string, unknown>>(
  text: string,
  values: unknown[] = []
): Promise<Row | null> {
  const result = await query<Row>(text, values);
  return result.rows[0] ?? null;
}

export async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors so the original failure can bubble up.
    }
    logError('db.client', error, { action: 'withTransaction' });
    throw error;
  } finally {
    client.release();
  }
}

export function getPublicClient(): Pool {
  return getPool();
}

export function getServiceClient(): Pool {
  return getPool();
}

export async function withServiceClient<T>(handler: (client: Pool) => Promise<T>): Promise<T> {
  return handler(getPool());
}

export async function resetClients(): Promise<void> {
  if (sharedPool) {
    await sharedPool.end();
  }
  sharedPool = null;
}
