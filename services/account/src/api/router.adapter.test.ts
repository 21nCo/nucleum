import { describe, expect, it, vi } from 'vitest';
import { DatafnExecutorError } from '@datafn/server';
import { createMemoryRuntimeStores } from '@superfunctions/db/adapters/memory';
import type { AuthFnSession } from 'authfn';
import type { SyncServer } from '../datafn/server.js';
import { createInterfaceApiRouter, type InterfaceApiServices } from './router.js';

/**
 * Routes against an executor that behaves like DataFn on PostgreSQL: numeric
 * columns come back as strings, ascending sorts put nulls last and descending
 * ones first, strings compare by code point, a single mutation's conflict is
 * thrown as a 409 executor error, and no replay record survives a write (as
 * after an interruption between the insert and saving it).
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
  const mutations: Row[] = [];
  /** Holds each mutation until the returned promise resolves, when set. */
  let gate: (() => Promise<void>) | null = null;
  /** Runs before each query, when set; it may change rows or throw. */
  let beforeQuery: ((count: number) => void) | null = null;
  const executor = {
    async query(payload: Row) {
      queries.push(payload);
      beforeQuery?.(queries.length);
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
      mutations.push(payload);
      if (gate) await gate();
      const existing = rows.find((row) => row.resource === payload.resource && row.id === payload.id);
      if (payload.operation === 'insert') {
        if (existing) {
          // As DataFn's executor does for one mutation's CONFLICT envelope.
          throw new DatafnExecutorError({ code: 'CONFLICT', message: 'Record already exists', details: { path: 'id' } }, 409);
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
  const session = {
    type: 'api-key',
    credential: { type: 'api-key', id: 'key-1' },
    actorId: 'user-1',
    actorType: 'user',
    scopes: ['pointron:read', 'pointron:write']
  };
  const services: InterfaceApiServices = {
    authenticate: () => session as unknown as AuthFnSession,
    getSyncServer: async () => ({ executor }) as unknown as SyncServer,
    ...overrides
  };
  return {
    services,
    queries,
    mutations,
    hold: (next: (() => Promise<void>) | null) => { gate = next; },
    onQuery: (next: ((count: number) => void) | null) => { beforeQuery = next; }
  };
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

/** A cursor as a client could build one by hand. */
function handCursor(cursor: Row): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

async function readAll(services: InterfaceApiServices, query: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const response = await send(services, `/v1/pointron/tasks?${query}${cursor ? `&cursor=${cursor}` : ''}`);
    const page = await response.json() as { data: Row[]; nextCursor: string | null };
    expect(response.status, JSON.stringify(page)).toBe(200);
    ids.push(...page.data.map((row) => String(row.id)));
    cursor = page.nextCursor;
    pages += 1;
  } while (cursor && pages < 20);
  return ids;
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

  it('delivers a row whose sort value changes between segment reads once, and continues after it', async () => {
    const rows = [
      { ...task('task:a', null), completedAtUnix: '100' },
      { ...task('task:b', null), completedAtUnix: '200' },
      { ...task('task:c', null), completedAtUnix: null },
      { ...task('task:d', null), completedAtUnix: null }
    ];
    const { services, onQuery } = createPostgresLikeServices(rows);
    // After the first segment read task:a, a concurrent uncheck nulls it.
    onQuery((count) => {
      if (count === 2) rows[0].completedAtUnix = null;
    });
    const response = await send(services, '/v1/pointron/tasks?sort=completedAtUnix&limit=3');
    const page = await response.json() as { data: Row[]; nextCursor: string };
    expect(page.data.map((row) => row.id)).toEqual(['task:a', 'task:b', 'task:c']);
    onQuery(null);
    const next = await (await send(services, `/v1/pointron/tasks?sort=completedAtUnix&limit=3&cursor=${page.nextCursor}`))
      .json() as { data: Row[]; nextCursor: string | null };
    expect(next.data.map((row) => row.id)).toEqual(['task:d']);
    expect(next.nextCursor).toBeNull();
  });

  it('keeps an equality filter on the sort field and refuses a cursor that contradicts it', async () => {
    const rows = [task('task:a', '900'), task('task:d', '900'), task('task:f', '20')];
    const { services } = createPostgresLikeServices(rows);
    expect(await readAll(services, 'dateUnix=900&sort=dateUnix&limit=1')).toEqual(['task:a', 'task:d']);
    const contradicting = handCursor({ sort: 'dateUnix', value: 20, id: 'task:a' });
    const response = await send(services, `/v1/pointron/tasks?dateUnix=900&sort=dateUnix&cursor=${contradicting}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'invalid_parameter' });
  });

  it('refuses a cursor value of the wrong kind before querying and accepts numeric strings', async () => {
    const { services, queries } = createPostgresLikeServices([task('task:a', '900'), task('task:f', '20')]);
    const wrong = await send(services, `/v1/pointron/tasks?sort=dateUnix&cursor=${handCursor({ sort: 'dateUnix', value: 'abc', id: 'task:a' })}`);
    expect(wrong.status).toBe(400);
    expect(wrong.headers.get('content-type')).toContain('application/problem+json');
    expect(await wrong.json()).toMatchObject({ code: 'invalid_parameter' });
    expect(queries).toHaveLength(0);
    const numeric = await send(services, `/v1/pointron/tasks?sort=dateUnix&cursor=${handCursor({ sort: 'dateUnix', value: '20', id: 'task:f' })}`);
    expect(numeric.status).toBe(200);
    expect((await numeric.json() as { data: Row[] }).data.map((row) => row.id)).toEqual(['task:a']);
  });

  it('refuses a cursor that is not a whole number on an integer sort before querying', async () => {
    const rows = ['task:a', 'task:b', 'task:c'].map((id, index) => ({ ...task(id, '900'), createdAt: 1000 + index }));
    const { services, queries } = createPostgresLikeServices(rows);
    for (const value of [1.5, 1e30, '1.5']) {
      const response = await send(services, `/v1/pointron/tasks?sort=createdAt&cursor=${handCursor({ sort: 'createdAt', value, id: 'task:a' })}`);
      expect(response.status, String(value)).toBe(400);
      expect(response.headers.get('content-type')).toContain('application/problem+json');
      expect(await response.json()).toMatchObject({ code: 'invalid_parameter', parameter: 'cursor' });
    }
    expect(queries).toHaveLength(0);
    const whole = await send(services, `/v1/pointron/tasks?sort=createdAt&cursor=${handCursor({ sort: 'createdAt', value: 1000, id: 'task:a' })}`);
    expect(whole.status).toBe(200);
    expect((await whole.json() as { data: Row[] }).data.map((row) => row.id)).toEqual(['task:b', 'task:c']);
  });

  it.each([
    { name: 'a failed result', fail: () => ({ ok: false, errors: [{ code: 'INTERNAL', message: 'Failed query', path: '$' }] }) },
    { name: 'a thrown internal error', fail: () => { throw new DatafnExecutorError({ code: 'INTERNAL', message: 'Internal error' }, 500); } }
  ])('answers 422 when the referenced record is removed while the write runs ($name)', async ({ fail }) => {
    const rows: Row[] = [{ resource: 'objective', id: 'objective:g', label: 'Goal' }];
    const base = createPostgresLikeServices(rows);
    const executor = (await base.services.getSyncServer()).executor as unknown as Record<string, unknown>;
    let removed = true;
    const services: InterfaceApiServices = {
      ...base.services,
      getSyncServer: async () => ({
        executor: {
          ...executor,
          // The objective goes away after the reference check, so the
          // database refuses the write with a foreign-key failure.
          mutate: async () => {
            if (removed) rows.splice(rows.findIndex((row) => row.id === 'objective:g'), 1);
            return fail();
          }
        }
      }) as unknown as SyncServer
    };
    const response = await send(services, '/v1/pointron/tasks', {
      method: 'POST',
      body: JSON.stringify({ label: 'Late', dateUnix: 900, objectiveId: 'objective:g' })
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: 'validation_failed',
      errors: [expect.objectContaining({ pointer: '/objectiveId' })]
    });
    // A failure while the reference still exists stays an internal error.
    rows.push({ resource: 'objective', id: 'objective:g', label: 'Goal' });
    removed = false;
    const other = await send(services, '/v1/pointron/tasks', {
      method: 'POST',
      body: JSON.stringify({ label: 'Late', dateUnix: 900, objectiveId: 'objective:g' })
    });
    expect(other.status).toBe(500);
  });

  it.each([
    { method: 'PATCH', path: '/v1/pointron/tasks/task:a', operation: 'merge', status: 200, body: { label: 'Renamed' }, other: { label: 'Other' } },
    { method: 'POST', path: '/v1/pointron/tasks', operation: 'insert', status: 201,
      body: { label: 'Created', dateUnix: 1_700_000_000_000 }, other: { label: 'Other', dateUnix: 1_700_000_000_000 } }
  ])('keeps a $method key bound to its body after the write commits and its readback fails', async (write) => {
    const { services, mutations, hold, onQuery } = createPostgresLikeServices([task('task:a', null)], {
      idempotencyStore: createMemoryRuntimeStores().atomicKv,
      logError: () => undefined
    });
    hold(async () => {
      hold(null);
      // The mutation commits; the next read (the readback) fails once.
      onQuery(() => {
        onQuery(null);
        throw new DatafnExecutorError({ code: 'INTERNAL', message: 'database unavailable' }, 500);
      });
    });
    const headers = { 'idempotency-key': 'readback-fails' };
    const first = await send(services, write.path, { method: write.method, headers, body: JSON.stringify(write.body) });
    expect(first.status).toBe(500);
    const other = await send(services, write.path, { method: write.method, headers, body: JSON.stringify(write.other) });
    expect(other.status).toBe(422);
    expect(await other.json()).toMatchObject({ code: 'idempotency_key_reused' });
    const retry = await send(services, write.path, { method: write.method, headers, body: JSON.stringify(write.body) });
    expect(retry.status).toBe(write.status);
    expect(retry.headers.get('idempotent-replayed')).toBe('true');
    expect(await retry.json()).toMatchObject(write.body);
    expect(mutations.filter((mutation) => mutation.operation === write.operation)).toHaveLength(1);
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

  it('updates once for overlapping requests with one Idempotency-Key and replays the finished one', async () => {
    const rows = [task('task:a', null)];
    const { services, mutations, hold } = createPostgresLikeServices(rows, {
      idempotencyStore: createMemoryRuntimeStores().atomicKv
    });
    let release!: () => void;
    const reached = new Promise<void>((resolve) => {
      hold(() => {
        resolve();
        return new Promise<void>((done) => { release = done; });
      });
    });
    const patch = { method: 'PATCH', headers: { 'idempotency-key': 'check-once' }, body: JSON.stringify({ isChecked: true }) };
    const first = send(services, '/v1/pointron/tasks/task:a', patch);
    await reached;
    const overlapping = await send(services, '/v1/pointron/tasks/task:a', patch);
    expect(overlapping.status).toBe(409);
    expect(overlapping.headers.get('retry-after')).toBe('1');
    expect((await overlapping.json() as Row).code).toBe('idempotency_in_progress');
    release();
    const done = await first;
    expect(done.status).toBe(200);
    const written = await done.json() as Row;
    expect(written.completedAtUnix).toEqual(expect.any(Number));
    hold(null);
    const retry = await send(services, '/v1/pointron/tasks/task%3Aa/', patch);
    expect(retry.status).toBe(200);
    expect(retry.headers.get('idempotent-replayed')).toBe('true');
    expect(await retry.json()).toEqual(written);
    expect(mutations.filter((mutation) => mutation.operation === 'merge')).toHaveLength(1);
  });

  it('frees an update key whose write fails so the retry writes', async () => {
    const { services, mutations, hold } = createPostgresLikeServices([task('task:a', null)], {
      idempotencyStore: createMemoryRuntimeStores().atomicKv,
      logError: () => undefined
    });
    hold(async () => {
      hold(null);
      throw new DatafnExecutorError({ code: 'INTERNAL', message: 'database unavailable' }, 500);
    });
    const patch = { method: 'PATCH', headers: { 'idempotency-key': 'retry-after-failure' }, body: JSON.stringify({ label: 'Renamed' }) };
    expect((await send(services, '/v1/pointron/tasks/task:a', patch)).status).toBe(500);
    const retry = await send(services, '/v1/pointron/tasks/task:a', patch);
    expect(retry.status).toBe(200);
    expect(retry.headers.get('idempotent-replayed')).toBeNull();
    expect(await retry.json()).toMatchObject({ label: 'Renamed' });
    expect(mutations).toHaveLength(2);
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
