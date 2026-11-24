import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { interfaceApps, interfaceContract, interfaceResources } from '@nucleum/schema/interfaces';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { createInterfaceApiRouter } from './router.js';
import { resourceSegment } from './resources.js';

const base = 'http://127.0.0.1:8787';

type Headers = Record<string, string>;
type Body = Record<string, unknown>;

interface Actors {
  cookie: Headers;
  memotronRead: Headers;
  memotronWrite: Headers;
  pointronWrite: Headers;
  nucleumWrite: Headers;
  unscoped: Headers;
}

let harness: AccountTestHarness;
let actors: Actors;
let sequence = 0;

async function call(
  path: string,
  headers: Headers,
  init: { method?: string; body?: unknown } = {}
): Promise<Response> {
  return harness.app.fetch(new Request(`${base}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: { 'content-type': 'application/json', ...headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  }));
}

async function json(response: Response, status: number): Promise<Body> {
  const body = await response.json() as Body;
  expect(response.status, JSON.stringify(body)).toBe(status);
  return body;
}

/** Asserts an RFC 9457 problem response and returns its body. */
async function problem(response: Response, status: number, code: string): Promise<Body> {
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  const body = await json(response, status);
  expect(body).toMatchObject({ type: 'about:blank', status, code });
  expect(typeof body.title).toBe('string');
  expect(typeof body.detail).toBe('string');
  return body;
}

async function ids(response: Response): Promise<string[]> {
  const body = await json(response, 200);
  return (body.data as Body[]).map((row) => String(row.id)).sort();
}

/** Builds a throwaway sign-up credential at runtime that meets the password policy. */
function generateCredential(): string {
  return [randomUUID().toUpperCase(), randomUUID(), '!'].join('');
}

async function signUp(): Promise<Headers> {
  const response = await call('/auth/sign-up/password', { origin: base }, {
    body: { email: 'v1-api@example.test', password: generateCredential(), sessionMode: 'hybrid' }
  });
  expect(response.status).toBe(200);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
  const csrf = cookies.find((cookie) => cookie.startsWith('nucleus.csrf='))?.split('=')[1];
  expect(csrf).toBeTruthy();
  return { cookie: cookies.join('; '), 'x-authfn-csrf': csrf ?? '', origin: base };
}

async function createKey(cookie: Headers, scopes: string[]): Promise<{ headers: Headers; keyId: string }> {
  const response = await call('/auth/api-keys', cookie, { body: { name: scopes.join(' ') || 'none', scopes } });
  expect(response.status).toBe(201);
  const body = await response.json() as { data: { secret: string; keyId: string } };
  return { headers: { authorization: `Bearer ${body.data.secret}` }, keyId: body.data.keyId };
}

function mutation(resource: string, operation: string, id: string, extra: Body): Body {
  sequence += 1;
  return { resource, version: 1, operation, id, ...extra, clientId: 'v1-test', mutationId: `v1-test-${sequence}` };
}

const insert = (resource: string, id: string, record: Body) => mutation(resource, 'insert', id, { record });
const relate = (resource: string, id: string, relations: Body) => mutation(resource, 'relate', id, { relations });

beforeAll(async () => {
  harness = createAccountTestHarness({ enableRateLimit: false });
  const cookie = await signUp();
  actors = {
    cookie,
    memotronRead: (await createKey(cookie, ['memotron:read'])).headers,
    memotronWrite: (await createKey(cookie, ['memotron:read', 'memotron:write'])).headers,
    pointronWrite: (await createKey(cookie, ['pointron:*'])).headers,
    nucleumWrite: (await createKey(cookie, ['nucleum:*'])).headers,
    unscoped: (await createKey(cookie, [])).headers
  };
  const seeded = await call('/datafn/mutation', cookie, {
    body: [
      insert('node', 'node:n1', { label: 'Alpha note', contentType: 'SIMPLE_TEXT' }),
      insert('objective', 'objective:o1', { label: 'Alpha goal', type: 'goal', status: 'active' }),
      insert('task', 'task:t1', { label: 'Alpha task', dateUnix: 1_700_000_000_000 }),
      insert('collection', 'collection:notes', { label: 'Notes', type: 'list', resource: 'node' }),
      insert('collection', 'collection:goals', { label: 'Goals', type: 'list', resource: 'objective' }),
      ...['notes', 'goals'].map((name) => insert('view', `view:${name}`, { label: name, layout: 'list' })),
      relate('collection', 'collection:notes', { views: ['view:notes'] }),
      relate('collection', 'collection:goals', { views: ['view:goals'] }),
      insert('space', 'space:mixed', {
        label: 'Mixed',
        view: 'sidenav',
        items: [
          { id: 'item-node', type: 'resource', resourceType: 'node', resourceId: 'node:n1', label: 'Note' },
          { id: 'item-goal', type: 'resource', resourceType: 'objective', resourceId: 'objective:o1', label: 'Goal' }
        ]
      })
    ]
  });
  expect(seeded.status).toBe(200);
});

describe('v1 routers', () => {
  it('offer list and get for every exposed resource, create and update only where the contract allows, and never delete', () => {
    for (const app of interfaceApps) {
      const routes = createInterfaceApiRouter(app).getRoutes().map((route) => `${route.method} ${route.path}`);
      const expected = interfaceContract[app].resources.flatMap((resource) => {
        const contract = interfaceResources[resource];
        const path = `/v1/${app}/${resourceSegment(resource)}`;
        return [
          `GET ${path}`,
          `GET ${path}/:id`,
          ...(contract.create ? [`POST ${path}`] : []),
          ...(contract.update ? [`PATCH ${path}/:id`] : [])
        ];
      });
      expect(routes.sort()).toEqual([...expected, `GET /v1/${app}/search`].sort());
    }
  });
});

describe('v1 authentication and scopes', () => {
  it('refuses requests without a bearer token, including a cookie session alone', async () => {
    for (const headers of [{}, actors.cookie, { authorization: 'Bearer not-a-real-token' }]) {
      const response = await call('/v1/memotron/nodes', headers);
      await problem(response, 401, 'unauthenticated');
      expect(response.headers.get('www-authenticate')).toContain('Bearer realm="memotron"');
    }
  });

  it('serves each app only to tokens holding its scope or nucleum', async () => {
    const cases: [keyof Actors, string, number][] = [
      ['memotronRead', '/v1/memotron/nodes', 200],
      ['memotronRead', '/v1/pointron/objectives', 403],
      ['memotronRead', '/v1/nucleum/nodes', 403],
      ['pointronWrite', '/v1/pointron/objectives', 200],
      ['pointronWrite', '/v1/memotron/nodes', 403],
      ['nucleumWrite', '/v1/memotron/nodes', 200],
      ['nucleumWrite', '/v1/pointron/tasks', 200],
      ['nucleumWrite', '/v1/nucleum/objectives', 200],
      ['unscoped', '/v1/memotron/nodes', 403],
      ['unscoped', '/v1/nucleum/nodes', 403]
    ];
    for (const [actor, path, status] of cases) {
      const response = await call(path, actors[actor]);
      if (status === 200) await json(response, 200);
      else await problem(response, 403, 'insufficient_scope');
    }
  });

  it('requires the write scope for writes and names the scopes needed', async () => {
    const response = await call('/v1/memotron/nodes', actors.memotronRead, {
      body: { label: 'Denied', contentType: 'SIMPLE_TEXT' }
    });
    const body = await problem(response, 403, 'insufficient_scope');
    expect(body.scopes).toEqual(['memotron:read', 'memotron:write']);
    expect(response.headers.get('www-authenticate')).toContain('error="insufficient_scope"');
    expect(await ids(await call('/v1/nucleum/nodes?limit=100', actors.nucleumWrite)))
      .not.toContain(expect.stringMatching(/Denied/));
  });

  it('refuses a token once it is revoked', async () => {
    const key = await createKey(actors.cookie, ['memotron:read']);
    await json(await call('/v1/memotron/nodes', key.headers), 200);
    const revoked = await call(`/auth/api-keys/${encodeURIComponent(key.keyId)}`, actors.cookie, { method: 'DELETE' });
    expect(revoked.ok).toBe(true);
    await problem(await call('/v1/memotron/nodes', key.headers), 401, 'unauthenticated');
  });
});

describe('v1 shared resources', () => {
  it('filters collections to the app, whichever token calls the app', async () => {
    for (const actor of ['memotronRead', 'nucleumWrite'] as const) {
      expect(await ids(await call('/v1/memotron/collections', actors[actor]))).toEqual(['collection:notes']);
    }
    expect(await ids(await call('/v1/pointron/collections', actors.pointronWrite))).toEqual(['collection:goals']);
    expect(await ids(await call('/v1/nucleum/collections', actors.nucleumWrite)))
      .toEqual(['collection:goals', 'collection:notes']);
    await problem(await call('/v1/memotron/collections/collection:goals', actors.memotronRead), 404, 'not_found');
    await problem(await call('/v1/memotron/collections?resource=objective', actors.memotronRead), 400, 'invalid_parameter');
  });

  it('lists views through their collections without paging', async () => {
    expect(await ids(await call('/v1/memotron/views', actors.memotronRead))).toEqual(['view:notes']);
    const page = await json(await call('/v1/memotron/views', actors.memotronRead), 200);
    expect(page.nextCursor).toBeNull();
    await problem(await call('/v1/memotron/views?limit=1', actors.memotronRead), 400, 'invalid_parameter');
    await problem(await call('/v1/memotron/views/view:goals', actors.memotronRead), 404, 'not_found');
  });

  it('shows only the space items an app may see', async () => {
    const memotron = await json(await call('/v1/memotron/spaces/space:mixed', actors.memotronRead), 200);
    expect((memotron.items as Body[]).map((item) => item.id)).toEqual(['item-node']);
    const nucleum = await json(await call('/v1/nucleum/spaces/space:mixed', actors.nucleumWrite), 200);
    expect((nucleum.items as Body[]).map((item) => item.id)).toEqual(['item-node', 'item-goal']);
  });

  it('creates shared records only for the app types', async () => {
    await problem(await call('/v1/memotron/collections', actors.memotronWrite, {
      body: { label: 'Goals 2', type: 'list', resource: 'objective' }
    }), 422, 'validation_failed');
    const created = await json(await call('/v1/memotron/collections', actors.memotronWrite, {
      body: { label: 'Notes 2', type: 'list', resource: 'node' }
    }), 201);
    expect(created).toMatchObject({ label: 'Notes 2', resource: 'node' });
  });
});

describe('v1 lists', () => {
  it('pages with cursors in sort order and binds a cursor to its sort', async () => {
    for (const label of ['Page c', 'Page a', 'Page e', 'Page b', 'Page d']) {
      await json(await call('/v1/memotron/nodes', actors.memotronWrite, {
        body: { label, contentType: 'SIMPLE_TEXT' }
      }), 201);
    }
    const labels: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const query = `?contentType=SIMPLE_TEXT&sort=label&limit=2${cursor ? `&cursor=${cursor}` : ''}`;
      const page = await json(await call(`/v1/memotron/nodes${query}`, actors.memotronRead), 200);
      labels.push(...(page.data as Body[]).map((row) => String(row.label)));
      cursor = page.nextCursor as string | null;
      pages += 1;
    } while (cursor && pages < 10);
    const expected = labels.filter((label) => label.startsWith('Page '));
    expect(expected).toEqual(['Page a', 'Page b', 'Page c', 'Page d', 'Page e']);
    expect(labels).toEqual([...labels].sort());

    const first = await json(await call('/v1/memotron/nodes?sort=label&limit=1', actors.memotronRead), 200);
    await problem(await call(`/v1/memotron/nodes?sort=-label&cursor=${first.nextCursor}`, actors.memotronRead), 400, 'invalid_parameter');
    await problem(await call('/v1/memotron/nodes?cursor=not-a-cursor', actors.memotronRead), 400, 'invalid_parameter');
  });

  it('rejects unknown, repeated and invalid parameters', async () => {
    for (const query of ['?limit=0', '?limit=101', '?sort=text', '?parentPath=x', '?isStarred=maybe', '?label=a&label=b']) {
      await problem(await call(`/v1/memotron/nodes${query}`, actors.memotronRead), 400, 'invalid_parameter');
    }
  });

  it('projects records to the contract fields', async () => {
    const node = await json(await call('/v1/memotron/nodes/node:n1', actors.memotronRead), 200);
    expect(Object.keys(node).every((key) => interfaceResources.node.fields.includes(key as never))).toBe(true);
    expect(node).toMatchObject({ id: 'node:n1', label: 'Alpha note' });
    expect(node).not.toHaveProperty('createdBy');
  });
});

describe('v1 writes', () => {
  it('creates a record with a Location header and refuses fields the contract does not allow', async () => {
    const response = await call('/v1/memotron/nodes', actors.memotronWrite, {
      body: { label: 'Created', contentType: 'SIMPLE_TEXT', isStarred: true }
    });
    const created = await json(response, 201);
    expect(String(created.id)).toMatch(/^node:/);
    expect(response.headers.get('location')).toBe(`/v1/memotron/nodes/${encodeURIComponent(String(created.id))}`);
    const invalid = await problem(await call('/v1/memotron/nodes', actors.memotronWrite, {
      body: { label: 7, parent: 'node:n1' }
    }), 422, 'validation_failed');
    expect((invalid.errors as Body[]).map((error) => error.pointer).sort())
      .toEqual(['/contentType', '/label', '/parent']);
    await problem(await call('/v1/memotron/nodes', actors.memotronWrite, { body: ['not', 'an', 'object'] }),
      422, 'validation_failed');
  });

  it('replays a write repeated with the same Idempotency-Key', async () => {
    const headers = { ...actors.memotronWrite, 'idempotency-key': `create-${randomUUID()}` };
    const body = { label: 'Once only', contentType: 'SIMPLE_TEXT' };
    const first = await call('/v1/memotron/nodes', headers, { body });
    const created = await json(first, 201);
    const second = await call('/v1/memotron/nodes', headers, { body });
    expect(await json(second, 201)).toEqual(created);
    expect(second.headers.get('idempotent-replayed')).toBe('true');
    const list = await json(await call('/v1/memotron/nodes?limit=100', actors.memotronRead), 200);
    expect((list.data as Body[]).filter((row) => row.label === 'Once only')).toHaveLength(1);
    await problem(await call('/v1/memotron/nodes', { ...actors.memotronWrite, 'idempotency-key': 'has space' }, { body }),
      400, 'invalid_parameter');
  });

  it('updates only the fields sent and answers 404 for records it cannot see', async () => {
    const updated = await json(await call('/v1/memotron/nodes/node:n1', actors.memotronWrite, {
      method: 'PATCH',
      body: { notes: 'Edited' }
    }), 200);
    expect(updated).toMatchObject({ id: 'node:n1', label: 'Alpha note', notes: 'Edited' });
    await problem(await call('/v1/memotron/nodes/node:missing', actors.memotronWrite, {
      method: 'PATCH', body: { notes: 'x' }
    }), 404, 'not_found');
    await problem(await call('/v1/memotron/nodes/objective:o1', actors.memotronWrite, {
      method: 'PATCH', body: { notes: 'x' }
    }), 404, 'not_found');
    await problem(await call('/v1/memotron/nodes/node:n1', actors.memotronWrite, { method: 'PATCH', body: {} }),
      422, 'validation_failed');
    await problem(await call('/v1/memotron/nodes/node:n1', actors.memotronWrite, {
      method: 'PATCH', body: { contentType: 'LINK' }
    }), 422, 'validation_failed');
  });

  it('sets a task completion time with its checked state', async () => {
    const checked = await json(await call('/v1/pointron/tasks/task:t1', actors.pointronWrite, {
      method: 'PATCH', body: { isChecked: true }
    }), 200);
    expect(checked.isChecked).toBe(true);
    expect(typeof checked.completedAtUnix).toBe('number');
    const unchecked = await json(await call('/v1/pointron/tasks/task:t1', actors.pointronWrite, {
      method: 'PATCH', body: { isChecked: false }
    }), 200);
    expect(unchecked.isChecked).toBe(false);
    expect(unchecked.completedAtUnix ?? null).toBeNull();
  });

  it('offers no write routes for read-only resources and no deletes', async () => {
    await problem(await call('/v1/pointron/sessions', actors.pointronWrite, { body: { type: 'COUNTUP' } }),
      405, 'method_not_allowed');
    const removed = await call('/v1/memotron/nodes/node:n1', actors.memotronWrite, { method: 'DELETE' });
    await problem(removed, 405, 'method_not_allowed');
    expect(removed.headers.get('allow')).toBe('GET, PATCH');
    await problem(await call('/v1/memotron/unknown', actors.memotronWrite), 404, 'not_found');
    await problem(await call('/v1/other/nodes', actors.memotronWrite), 404, 'not_found');
  });
});

describe('v1 search', () => {
  it('searches only the app resources', async () => {
    const memotron = await json(await call('/v1/memotron/search?q=Alpha', actors.memotronRead), 200);
    expect((memotron.data as Body[]).map((hit) => hit.id)).toContain('node:n1');
    expect((memotron.data as Body[]).every((hit) => hit.resource === 'node' || hit.resource === 'file')).toBe(true);
    const pointron = await json(await call('/v1/pointron/search?q=Alpha', actors.pointronWrite), 200);
    expect((pointron.data as Body[]).map((hit) => hit.id)).toEqual(expect.arrayContaining(['objective:o1', 'task:t1']));
    expect((pointron.data as Body[]).every((hit) => hit.resource !== 'node')).toBe(true);
    const hit = (memotron.data as Body[]).find((entry) => entry.id === 'node:n1');
    expect(hit?.record).toMatchObject({ id: 'node:n1', label: 'Alpha note' });
  });

  it('validates the search parameters', async () => {
    for (const query of ['', '?q=', '?q=Alpha&resource=objective', '?q=Alpha&limit=51', '?q=Alpha&extra=1']) {
      await problem(await call(`/v1/memotron/search${query}`, actors.memotronRead), 400, 'invalid_parameter');
    }
  });
});
