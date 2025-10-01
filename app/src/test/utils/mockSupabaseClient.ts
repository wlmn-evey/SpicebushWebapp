import { vi } from 'vitest';

export interface SupabaseResponse<T = unknown> {
  data?: T;
  error?: unknown;
}

export interface OperationCall {
  method: string;
  args: unknown[];
}

export interface QueryExecution<T = unknown> {
  operations: OperationCall[];
  response: SupabaseResponse<T>;
}

interface TableState {
  responses: SupabaseResponse[];
  executions: QueryExecution[];
}

const toSupabaseResponse = (value: SupabaseResponse | undefined): SupabaseResponse => {
  if (value) return value;
  return { data: undefined, error: undefined };
};

const createQueryBuilder = (state: TableState) => {
  const operations: OperationCall[] = [];

  const consume = () => {
    const response = toSupabaseResponse(state.responses.shift());
    state.executions.push({ operations: [...operations], response });
    return Promise.resolve(response);
  };

  const builder: any = {
    select: vi.fn((...args: unknown[]) => {
      operations.push({ method: 'select', args });
      return builder;
    }),
    eq: vi.fn((...args: unknown[]) => {
      operations.push({ method: 'eq', args });
      return builder;
    }),
    order: vi.fn((...args: unknown[]) => {
      operations.push({ method: 'order', args });
      return builder;
    }),
    maybeSingle: vi.fn((...args: unknown[]) => {
      operations.push({ method: 'maybeSingle', args });
      return consume();
    }),
    limit: vi.fn((...args: unknown[]) => {
      operations.push({ method: 'limit', args });
      return builder;
    }),
    range: vi.fn((...args: unknown[]) => {
      operations.push({ method: 'range', args });
      return builder;
    }),
    gte: vi.fn((...args: unknown[]) => {
      operations.push({ method: 'gte', args });
      return builder;
    })
  };

  const execute = () => consume();

  builder.then = ((...args: Parameters<Promise<SupabaseResponse>['then']>) => execute().then(...args));
  builder.catch = ((...args: Parameters<Promise<SupabaseResponse>['catch']>) => execute().catch(...args));
  builder.finally = ((...args: Parameters<Promise<SupabaseResponse>['finally']>) => execute().finally(...args));

  builder._operations = operations;

  return builder;
};

export const createMockSupabaseClient = () => {
  const tables = new Map<string, TableState>();
  const rpcs = new Map<string, TableState>();

  const client = {
    from: vi.fn((table: string) => {
      const state = tables.get(table);
      if (!state) {
        throw new Error(`No mock configured for table "${table}"`);
      }
      return createQueryBuilder(state);
    }),
    rpc: vi.fn((fnName: string, params?: Record<string, unknown>) => {
      const state = rpcs.get(fnName);
      if (!state) {
        throw new Error(`No mock configured for rpc "${fnName}"`);
      }
      const response = toSupabaseResponse(state.responses.shift());
      state.executions.push({ operations: [{ method: 'rpc', args: [params] }], response });
      return Promise.resolve(response);
    })
  };

  const setTableResponses = (table: string, responses: SupabaseResponse[]) => {
    tables.set(table, {
      responses: [...responses],
      executions: []
    });
  };

  const setRpcResponses = (fnName: string, responses: SupabaseResponse[]) => {
    rpcs.set(fnName, {
      responses: [...responses],
      executions: []
    });
  };

  const getTableExecutions = (table: string): QueryExecution[] => {
    return tables.get(table)?.executions ?? [];
  };

  const getRpcExecutions = (fnName: string): QueryExecution[] => {
    return rpcs.get(fnName)?.executions ?? [];
  };

  const reset = () => {
    tables.clear();
    rpcs.clear();
    client.from.mockClear();
    client.rpc.mockClear();
  };

  return {
    client,
    setTableResponses,
    setRpcResponses,
    getTableExecutions,
    getRpcExecutions,
    reset
  };
};
