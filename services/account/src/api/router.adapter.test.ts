import { describe, expect, it, vi } from 'vitest';
import { DatafnExecutorError } from '@datafn/server';
import type { AuthFnSession } from 'authfn';
import type { SyncServer } from '../datafn/server.js';
import { createInterfaceApiRouter, type InterfaceApiServices } from './router.js';

/**
 * Routes against an executor that behaves like DataFn on PostgreSQL: numeric
 * columns come back as strings, ascending sorts put nulls last and descending
 * ones first, strings compare by code point, and no replay record survives a
 * write (as after an interruption between the insert and saving it).
 */

type Row = Record<string, unknown>;
type Ops = Record<string, unknown>;

const NUMERIC = new Set(['dateUnix', 'completedAtUnix', 'minutes']);

function compare(field: string, a: unknown, b: unknown): number {
  if (NUMERIC.has(field)) return Number(a) - Number(b);
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

function matches(field: string, value: unknown, condition: unknown): boolean {
  const ops: Ops = typeof condition === 'object' && condition !== null && !Array.isArray(condition)
    ? condition as Ops
    : { eq: condition };
  return Object.entries(ops).every(([op, operand]) => {
    const present = value !== null && value !== undefined;
    switch (op) {
      case 'eq': return present && compare(field, value, operand) === 0;
      case 'gt': return present && compare(field, value, operand) > 0;
      case 'lt': return present && compare(field, value, operand) < 0;
      case 'in': return (operand as unknown[]).includes(value);
      case 'is_null': return present !== operand;
      case 'is_not_null': return present === operand;
      default: throw new Error(`unsupported operator ${op}`);
    }
  });
}

function sortRows(rows: Row[], sort: string[]): Row[] {
  return [...rows].sort((a, b) => {
    for (const term of sort) {
      const descending = term.startsWith('-');
      const field = term.replace(/^-/, '');
      const left = a[field] ?? null;
      const right = b[field] ?? null;
      if (left === null && right === null) continue;
      // PostgreSQL: NULLS LAST ascending, NULLS FIRST descending.
      if (left === null) return descending ? -1 : 1;
      if (right === null) return descending ? 1 : -1;
      const order = compare(field, left, right);
      if (order !== 0) return descending ? -order : order;
    }
    return 0;
  });
}

function createPostgresLikeServices(rows: Row[], overrides: Partial<InterfaceApiServices> = {}) {
  const queries: Row[] = [];
  const executor = {
    async query(payload: Row) {
      queries.push(payload);
      if ('cursor' in payload) throw new Error('the router must not rely on DataFn cursors');
      const filters = (payload.filters ?? {}) as Row;
      const selected = rows.filter((row) => row.resource === payload.resource &&
        Object.entries(filters).every(([field, condition]) => matches(field, row[field], condition)));
      const sorted = sortRows(selected, (payload.sort as string[] | undefined) ?? ['id']);
      const limit = payload.limit as number | undefined;
      if (limit !== undefined && limit > 100) throw new DatafnExecutorError({ code: 'DFQL_INVALID', message: 'limit' }, 400);
      return { data: (limit === undefined ? sorted : sorted.slice(0, limit)).map(({ resource: _, ...row }) => row) };
    },
    async mutate(payload: Row) {
      const existing = rows.find((row) => row.resource === payload.resource && row.id === payload.id);
      if (payload.operation === 'insert') {
        if (existing) {
          return { ok: false, errors: [{ code: 'CONFLICT', message: 'exists', path: 'id' }] };
        }
        rows.push({ resource: payload.resource, id: payload.id, ...(payload.record as Row) });
      } else if (existing) {
        Object.assign(existing, payload.record);
      }
      return { ok: true, affectedIds: [payload.id], deduped: false };
    },
    async search() {
      return { results: [] };
    }
  };
  const session = { actorId: 'user-1', actorType: 'user', scopes: ['pointron:read', 'pointron:write'] };
  const services: InterfaceApiServices = {
    authenticate: () => session as unknown as AuthFnSession,
    getSyncServer: async () => ({ executor }) as unknown as SyncServer,
    ...overrides
  };
  return { services, queries };
}

async function send(services: InterfaceApiServices, path: string, init: RequestInit = {}): Promise<Response> {
  const router = createInterfaceApiRouter('pointron', services);
  return router.handle(new Request(`http://api.test${path}`, {
    ...init,
    headers: { authorization: 'Bearer test-app-account-token', 'content-type': 'application/json', ...init.headers }
  }));
}

function task(id: string, dateUnix: string | null): Row {
  return { resource: 'task', id, label: `Task ${id}`, isChecked: false, dateUnix, minutes: '25' };
}

describe('v1 routes on PostgreSQL-like storage', () => {
  it('serializes numeric columns as JSON numbers', async () => {
    const { services } = createPostgresLikeServices([task('task:a', '1700000000000')]);
    const one = await (await send(services, '/v1/pointron/tasks/task:a')).json() as Row;
    expect(one).toMatchObject({ dateUnix: 1_700_000_000_000, minutes: 25 });
    const list = await (await send(services, '/v1/pointron/tasks')).json() as { data: Row[] };
    expect(list.data[0]).toMatchObject({ dateUnix: 1_700_000_000_000, minutes: 25 });
  });

  it('pages a nullable numeric sort in both directions without skipping or repeating a row', async () => {
    const rows = [
      task('task:a', '900'), task('task:b', null), task('task:c', '1000'), task('task:d', '900'),
      task('task:e', null), task('task:f', '20')
    ];
    for (const sort of ['dateUnix', '-dateUnix']) {
      for (const limit of [1, 2, 4]) {
        const { services } = createPostgresLikeServices(rows.map((row) => ({ ...row })));
        const seen: Row[] = [];
        let cursor: string | null = null;
        let pages = 0;
        do {
          const response = await send(services, `/v1/pointron/tasks?sort=${sort}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`);
          const page = await response.json() as { data: Row[]; nextCursor: string | null };
          expect(response.status, JSON.stringify(page)).toBe(200);
          seen.push(...page.data);
          cursor = page.nextCursor;
          pages += 1;
        } while (cursor && pages < 20);
        const expected = sort === 'dateUnix'
          ? ['task:f', 'task:a', 'task:d', 'task:c', 'task:b', 'task:e']
          : ['task:c', 'task:a', 'task:d', 'task:f', 'task:b', 'task:e'];
        expect(seen.map((row) => row.id), `${sort} limit ${limit}`).toEqual(expected);
      }
    }
  });

  it('pages a full-size page and reports the end of the list', async () => {
    const rows = Array.from({ length: 101 }, (_, index) => task(`task:${String(index).padStart(3, '0')}`, String(index)));
    const { services } = createPostgresLikeServices(rows);
    const first = await (await send(services, '/v1/pointron/tasks?sort=dateUnix&limit=100')).json() as { data: Row[]; nextCursor: string | null };
    expect(first.data).toHaveLength(100);
    expect(first.nextCursor).not.toBeNull();
    const second = await (await send(services, `/v1/pointron/tasks?sort=dateUnix&limit=100&cursor=${first.nextCursor}`))
      .json() as { data: Row[]; nextCursor: string | null };
    expect(second.data.map((row) => row.id)).toEqual(['task:100']);
    expect(second.nextCursor).toBeNull();
  });

  it('replays a keyed create whose replay record was lost and refuses the key with another body', async () => {
    const rows: Row[] = [];
    const { services } = createPostgresLikeServices(rows);
    const headers = { 'idempotency-key': 'interrupted-create' };
    const body = JSON.stringify({ label: 'Once', dateUnix: 1_700_000_000_000 });
    const first = await send(services, '/v1/pointron/tasks', { method: 'POST', headers, body });
    expect(first.status).toBe(201);
    const created = await first.json() as Row;
    const retry = await send(services, '/v1/pointron/tasks', { method: 'POST', headers, body });
    expect(retry.status).toBe(201);
    expect(retry.headers.get('idempotent-replayed')).toBe('true');
    expect((await retry.json() as Row).id).toBe(created.id);
    const other = await send(services, '/v1/pointron/tasks', {
      method: 'POST', headers, body: JSON.stringify({ label: 'Other', dateUnix: 1_700_000_000_000 })
    });
    expect(other.status).toBe(422);
    expect((await other.json() as Row).code).toBe('idempotency_key_reused');
    expect(rows.filter((row) => row.resource === 'task')).toHaveLength(1);
  });

  it('logs a DataFn failure it answers with a 500', async () => {
    const logError = vi.fn();
    const { services } = createPostgresLikeServices([], {
      logError,
      getSyncServer: async () => ({
        executor: {
          query: async () => {
            throw new DatafnExecutorError({ code: 'INTERNAL', message: 'database unavailable' }, 500);
          }
        }
      }) as unknown as SyncServer
    });
    const response = await send(services, '/v1/pointron/tasks');
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('database unavailable');
    expect(logError).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ message: 'database unavailable' }));
  });
});
