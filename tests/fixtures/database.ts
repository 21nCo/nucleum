import { vi } from "vitest";

export interface MockDatabaseProvider {
  getProductConfig: ReturnType<typeof vi.fn>;
  createSubscription: ReturnType<typeof vi.fn>;
  kvMerge?: ReturnType<typeof vi.fn>;
}

export const createDatabaseProvider = (overrides: Partial<MockDatabaseProvider> = {}) => {
  return {
    getProductConfig: vi.fn().mockResolvedValue({ env: {} }),
    createSubscription: vi.fn().mockResolvedValue([{ result: [{ subscribedAt: new Date().toISOString() }] }]),
    kvMerge: vi.fn(),
    ...overrides
  } satisfies MockDatabaseProvider;
};

export const createSurrealQuery = () => {
  const queries: string[] = [];
  return {
    queries,
    push(query: string) {
      queries.push(query);
    }
  };
};
