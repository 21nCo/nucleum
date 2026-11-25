import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { DatafnExecutorError } from '@datafn/server';
import { interfaceApps, interfaceContract, interfaceResources, type InterfaceApp } from '@nucleum/schema/interfaces';
import type { SyncContext, SyncServer } from '../datafn/server.js';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { resolveAccountUserNamespace } from '../datafn/namespace.js';
import { createInterfaceApiRouter, keyedCreateId } from './router.js';
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

async function signUp(email = 'v1-api@example.test'): Promise<Headers> {
  return (await signUpActor(email)).cookie;
}

async function signUpActor(email: string): Promise<{ cookie: Headers; actorId: string }> {
  const response = await call('/auth/sign-up/password', { origin: base }, {
    body: { email, password: generateCredential(), sessionMode: 'hybrid' }
  });
  expect(response.status).toBe(200);
  const actorId = String(((await response.clone().json()) as { data: { session: { actorId: string } } }).data.session.actorId);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
  const csrf = cookies.find((cookie) => cookie.startsWith('nucleus.csrf='))?.split('=')[1];
  expect(csrf).toBeTruthy();
  return { cookie: { cookie: cookies.join('; '), 'x-authfn-csrf': csrf ?? '', origin: base }, actorId };
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

  it('refuses an interactive session token sent as a Bearer token', async () => {
    const response = await call('/auth/sign-up/password', { origin: base }, {
      body: { email: 'v1-api-bearer@example.test', password: generateCredential(), sessionMode: 'bearer' }
    });
    expect(response.status).toBe(200);
    const token = String(((await response.json()) as { data: { token: string } }).data.token);
    const bearer = { authorization: `Bearer ${token}` };
    await json(await call('/datafn/status', bearer), 200);
    for (const path of ['/v1/nucleum/nodes', '/v1/memotron/nodes', '/v1/pointron/tasks']) {
      const refused = await call(path, bearer);
      await problem(refused, 401, 'unauthenticated');
      expect(refused.headers.get('www-authenticate')).toContain('Bearer realm=');
    }
    await problem(await call('/v1/nucleum/nodes', bearer, { body: { label: 'Session write', contentType: 'SIMPLE_TEXT' } }),
      401, 'unauthenticated');
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
    const stored = await json(await call('/v1/nucleum/nodes?limit=100', actors.nucleumWrite), 200);
    expect((stored.data as Body[]).map((row) => row.label)).not.toContain('Denied');
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
    await problem(await call('/v1/memotron/properties', actors.memotronWrite, {
      body: { label: 'No resource', propertyType: 'text' }
    }), 422, 'validation_failed');
    for (const segment of ['collections', 'properties']) {
      const route = createInterfaceApiRouter('memotron').getRoutes()
        .find((entry) => entry.method === 'POST' && entry.path === `/v1/memotron/${segment}`);
      const schema = (route?.meta as { body: { required: string[]; properties: { resource: { enum: string[] } } } }).body;
      expect(schema.required, segment).toContain('resource');
      expect(schema.properties.resource.enum, segment).toEqual(expect.arrayContaining(['node']));
      expect(schema.properties.resource.enum, segment).not.toContain('objective');
    }
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

  it('pages a nullable sort field in both directions, visiting every record once with nulls last', async () => {
    for (const [label, date] of [['Dated b', 1_700_000_200_000], ['Undated a', null], ['Dated a', 1_700_000_100_000],
      ['Undated b', null], ['Dated c', 1_700_000_200_000]] as const) {
      await json(await call('/v1/memotron/nodes', actors.memotronWrite, {
        body: { label, contentType: 'SIMPLE_TEXT', ...(date === null ? {} : { date }) }
      }), 201);
    }
    const all = await ids(await call('/v1/memotron/nodes?limit=100', actors.memotronRead));
    for (const sort of ['date', '-date']) {
      const seen: Body[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const query = `?sort=${sort}&limit=2${cursor ? `&cursor=${cursor}` : ''}`;
        const page = await json(await call(`/v1/memotron/nodes${query}`, actors.memotronRead), 200);
        seen.push(...page.data as Body[]);
        cursor = page.nextCursor as string | null;
        pages += 1;
      } while (cursor && pages < 100);
      expect(seen.map((row) => String(row.id)).sort(), sort).toEqual(all);
      const dates = seen.map((row) => (row.date ?? null) as number | null);
      const firstNull = dates.indexOf(null);
      expect(dates.slice(firstNull).every((date) => date === null), sort).toBe(true);
      const dated = dates.slice(0, firstNull === -1 ? undefined : firstNull) as number[];
      expect(dated, sort).toEqual([...dated].sort((a, b) => (sort === 'date' ? a - b : b - a)));
    }
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

  it('serves the created record at its Location', async () => {
    const response = await call('/v1/memotron/nodes', actors.memotronWrite, {
      body: { label: 'Located', contentType: 'SIMPLE_TEXT' }
    });
    const created = await json(response, 201);
    const location = response.headers.get('location');
    expect(location).toContain('%3A');
    expect(await json(await call(String(location), actors.memotronRead), 200)).toEqual(created);
  });

  it('keeps Idempotency-Keys apart per account and replays only the same body', async () => {
    const otherCookie = await signUp('v1-api-other@example.test');
    const other = (await createKey(otherCookie, ['memotron:read', 'memotron:write'])).headers;
    const key = { 'idempotency-key': `shared-${randomUUID()}` };
    const mine = await json(await call('/v1/memotron/nodes', { ...actors.memotronWrite, ...key }, {
      body: { label: 'Mine', contentType: 'SIMPLE_TEXT' }
    }), 201);
    const theirsResponse = await call('/v1/memotron/nodes', { ...other, ...key }, {
      body: { label: 'Theirs', contentType: 'SIMPLE_TEXT' }
    });
    const theirs = await json(theirsResponse, 201);
    expect(theirsResponse.headers.get('idempotent-replayed')).toBeNull();
    expect(theirs).toMatchObject({ label: 'Theirs' });
    expect(theirs.id).not.toBe(mine.id);
    expect(await ids(await call('/v1/memotron/nodes?limit=100', other))).toEqual([theirs.id]);

    const reused = await problem(await call('/v1/memotron/nodes', { ...actors.memotronWrite, ...key }, {
      body: { label: 'Mine again', contentType: 'SIMPLE_TEXT' }
    }), 422, 'idempotency_key_reused');
    expect(JSON.stringify(reused)).not.toContain(String(mine.id));
    const labels = async () => ((await json(await call('/v1/memotron/nodes?limit=100', actors.memotronRead), 200))
      .data as Body[]).map((row) => row.label);
    expect(await labels()).not.toContain('Mine again');

    await json(await call(`/v1/memotron/nodes/${mine.id}`, actors.memotronWrite, {
      method: 'PATCH', body: { label: 'Mine renamed' }
    }), 200);
    const replay = await call('/v1/memotron/nodes', { ...actors.memotronWrite, ...key }, {
      body: { label: 'Mine', contentType: 'SIMPLE_TEXT' }
    });
    expect(await json(replay, 201)).toMatchObject({ id: mine.id, label: 'Mine renamed' });
    expect(replay.headers.get('idempotent-replayed')).toBe('true');
    expect((await labels()).filter((label) => label === 'Mine' || label === 'Mine renamed')).toEqual(['Mine renamed']);
  });

  it('refuses an update Idempotency-Key reused with another body', async () => {
    const headers = { ...actors.memotronWrite, 'idempotency-key': `update-${randomUUID()}` };
    await json(await call('/v1/memotron/nodes/node:n1', headers, { method: 'PATCH', body: { notes: 'Keyed' } }), 200);
    const repeated = await call('/v1/memotron/nodes/node:n1', headers, { method: 'PATCH', body: { notes: 'Keyed' } });
    await json(repeated, 200);
    expect(repeated.headers.get('idempotent-replayed')).toBe('true');
    await problem(await call('/v1/memotron/nodes/node:n1', headers, { method: 'PATCH', body: { notes: 'Other' } }),
      422, 'idempotency_key_reused');
    expect(await json(await call('/v1/memotron/nodes/node:n1', actors.memotronRead), 200))
      .toMatchObject({ notes: 'Keyed' });
  });

  it('creates once for overlapping requests with one Idempotency-Key', async () => {
    const headers = { ...actors.memotronWrite, 'idempotency-key': `overlap-${randomUUID()}` };
    const body = { label: 'Overlapping', contentType: 'SIMPLE_TEXT' };
    const responses = await Promise.all(Array.from({ length: 4 }, () => call('/v1/memotron/nodes', headers, { body })));
    const created = await Promise.all(responses.map((response) => json(response, 201)));
    expect(new Set(created.map((row) => row.id)).size).toBe(1);
    const list = await json(await call('/v1/memotron/nodes?limit=100', actors.memotronRead), 200);
    expect((list.data as Body[]).filter((row) => row.label === 'Overlapping')).toHaveLength(1);
  });

  it('replays a keyed create whose record exists but whose replay record was lost', async () => {
    const { cookie, actorId } = await signUpActor('v1-api-lost-replay@example.test');
    const writer = (await createKey(cookie, ['memotron:read', 'memotron:write'])).headers;
    const value = `lost-${randomUUID()}`;
    const id = await keyedCreateId(actorId, 'memotron', 'node', value);
    const body = { label: 'Committed before the answer', contentType: 'SIMPLE_TEXT' };
    // The insert committed, but neither DataFn's replay record nor the key claim survived.
    const seeded = await call('/datafn/mutation', cookie, { body: [insert('node', id, body)] });
    expect(seeded.status).toBe(200);
    const retry = await call('/v1/memotron/nodes', { ...writer, 'idempotency-key': value }, { body });
    expect(await json(retry, 201)).toMatchObject({ id, ...body });
    expect(retry.headers.get('idempotent-replayed')).toBe('true');
    expect(await ids(await call('/v1/memotron/nodes?limit=100', writer))).toEqual([id]);
    await problem(await call('/v1/memotron/nodes', { ...writer, 'idempotency-key': value }, {
      body: { label: 'Another body', contentType: 'SIMPLE_TEXT' }
    }), 422, 'idempotency_key_reused');
    expect(await ids(await call('/v1/memotron/nodes?limit=100', writer))).toEqual([id]);
  });

  it('gives one identity to a key sent on another spelling of the same path', async () => {
    const key = { ...actors.memotronWrite, 'idempotency-key': `alias-${randomUUID()}` };
    const body = { label: 'Aliased create', contentType: 'SIMPLE_TEXT' };
    const created = await json(await call('/v1/memotron/nodes', key, { body }), 201);
    const slashed = await call('/v1/memotron/nodes/', key, { body });
    expect(await json(slashed, 201)).toEqual(created);
    expect(slashed.headers.get('idempotent-replayed')).toBe('true');
    const list = await json(await call('/v1/memotron/nodes?limit=100', actors.memotronRead), 200);
    expect((list.data as Body[]).filter((row) => row.label === 'Aliased create')).toHaveLength(1);

    const update = { ...actors.memotronWrite, 'idempotency-key': `alias-update-${randomUUID()}` };
    const id = String(created.id);
    await json(await call(`/v1/memotron/nodes/${id}`, update, { method: 'PATCH', body: { notes: 'Aliased' } }), 200);
    const encoded = await call(`/v1/memotron/nodes/${encodeURIComponent(id)}/`, update, {
      method: 'PATCH', body: { notes: 'Aliased' }
    });
    await json(encoded, 200);
    expect(encoded.headers.get('idempotent-replayed')).toBe('true');
    await problem(await call(`/v1/memotron/nodes/${encodeURIComponent(id)}`, update, {
      method: 'PATCH', body: { notes: 'Other' }
    }), 422, 'idempotency_key_reused');
    expect(await json(await call(`/v1/memotron/nodes/${id}`, actors.memotronRead), 200)).toMatchObject({ notes: 'Aliased' });
  });

  it('completes a task once for overlapping updates with one Idempotency-Key', async () => {
    const created = await json(await call('/v1/pointron/tasks', actors.pointronWrite, { body: { label: 'Check once', dateUnix: 1_700_000_000_000 } }), 201);
    const path = `/v1/pointron/tasks/${created.id}`;
    const headers = { ...actors.pointronWrite, 'idempotency-key': `check-${randomUUID()}` };
    const responses = await Promise.all([0, 1].map(() => call(path, headers, { method: 'PATCH', body: { isChecked: true } })));
    const answered: Body[] = [];
    for (const response of responses) {
      if (response.status === 409) await problem(response, 409, 'idempotency_in_progress');
      else answered.push(await json(response, 200));
    }
    expect(answered.length).toBeGreaterThan(0);
    const stored = await json(await call(path, actors.pointronWrite), 200);
    expect(stored.completedAtUnix).toEqual(expect.any(Number));
    for (const body of answered) expect(body.completedAtUnix).toBe(stored.completedAtUnix);
    const retry = await call(path, headers, { method: 'PATCH', body: { isChecked: true } });
    expect(await json(retry, 200)).toEqual(stored);
    expect(retry.headers.get('idempotent-replayed')).toBe('true');
  });

  it('answers a path that does not percent-decode with a problem', async () => {
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const response = await call('/v1/memotron/nodes/node%E0%A4%A', actors.memotronWrite, {
        method, ...(method === 'PATCH' ? { body: { notes: 'x' } } : {})
      });
      await problem(response, 400, 'invalid_path');
    }
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

  it.each([
    { app: 'pointron', path: 'tasks', actor: 'pointronWrite' as const, body: { dateUnix: 1_700_000_000_000 } },
    { app: 'memotron', path: 'nodes', actor: 'memotronWrite' as const, body: { contentType: 'SIMPLE_TEXT' } }
  ])('indexes $app $path created and renamed through v1 for search', async ({ app, path, actor, body }) => {
    const hits = async (q: string) => {
      const found = await json(await call(`/v1/${app}/search?q=${q}`, actors[actor]), 200);
      return (found.data as Body[]).map((hit) => hit.id);
    };
    const created = await json(await call(`/v1/${app}/${path}`, actors[actor], {
      body: { label: `Zebraprobe ${app}`, ...body }
    }), 201);
    expect(await hits('Zebraprobe')).toContain(created.id);
    await json(await call(`/v1/${app}/${path}/${encodeURIComponent(String(created.id))}`, actors[actor], {
      method: 'PATCH',
      body: { label: `Quokkaprobe ${app}` }
    }), 200);
    expect(await hits('Quokkaprobe')).toContain(created.id);
    expect(await hits('Zebraprobe')).not.toContain(created.id);
  });

  it('validates the search parameters', async () => {
    for (const query of ['', '?q=', '?q=Alpha&resource=objective', '?q=Alpha&limit=51', '?q=Alpha&extra=1']) {
      await problem(await call(`/v1/memotron/search${query}`, actors.memotronRead), 400, 'invalid_parameter');
    }
  });
});

describe('v1 browser access', () => {
  it('lets an allowed origin preflight updates with an Idempotency-Key and read the write headers', async () => {
    const origin = 'https://app.example.test';
    const browser = createAccountTestHarness({ enableRateLimit: false, corsOrigins: [origin] });
    const preflight = await browser.app.fetch(new Request(`${base}/v1/memotron/nodes/node:n1`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization, content-type, idempotency-key'
      }
    }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(origin);
    expect(preflight.headers.get('access-control-allow-methods')?.split(',')).toContain('PATCH');
    expect(preflight.headers.get('access-control-allow-headers')?.split(',')).toContain('idempotency-key');
    const response = await browser.app.fetch(new Request(`${base}/v1/memotron/nodes`, { headers: { origin } }));
    expect(response.status).toBe(401);
    expect(response.headers.get('access-control-expose-headers')?.split(','))
      .toEqual(expect.arrayContaining(['location', 'idempotent-replayed', 'www-authenticate', 'allow', 'retry-after']));
  });
});

describe('v1 archived records and references', () => {
  beforeAll(async () => {
    const seeded = await call('/datafn/mutation', actors.cookie, {
      body: [
        insert('node', 'node:archived', { label: 'Archived note', contentType: 'SIMPLE_TEXT', isArchived: true }),
        insert('objective', 'objective:archived', { label: 'Archived goal', type: 'goal', status: 'active', isArchived: true })
      ]
    });
    expect(seeded.status).toBe(200);
  });

  it('lists archived records only for isArchived=true and reads and updates them by id', async () => {
    expect(await ids(await call('/v1/memotron/nodes?isArchived=true', actors.memotronRead))).toEqual(['node:archived']);
    expect(await ids(await call('/v1/memotron/nodes?limit=100', actors.memotronRead))).not.toContain('node:archived');
    expect(await json(await call('/v1/memotron/nodes/node:archived', actors.memotronRead), 200))
      .toMatchObject({ id: 'node:archived', isArchived: true });
    expect(await json(await call('/v1/memotron/nodes/node:archived', actors.memotronWrite, {
      method: 'PATCH',
      body: { label: 'Archived note, renamed' }
    }), 200)).toMatchObject({ id: 'node:archived', label: 'Archived note, renamed', isArchived: true });
  });

  it('answers a write under an archived parent with the record it wrote', async () => {
    const created = await json(await call('/v1/pointron/tasks', actors.pointronWrite, {
      body: { label: 'Under an archived goal', dateUnix: 1_700_000_000_000, objectiveId: 'objective:archived' }
    }), 201);
    expect(created).toMatchObject({ label: 'Under an archived goal', dateUnix: 1_700_000_000_000, objectiveId: 'objective:archived' });
    const moved = await json(await call('/v1/pointron/tasks', actors.pointronWrite, {
      body: { label: 'Moved under an archived goal', dateUnix: 1_700_000_000_000 }
    }), 201);
    expect(await json(await call(`/v1/pointron/tasks/${String(moved.id)}`, actors.pointronWrite, {
      method: 'PATCH',
      body: { objectiveId: 'objective:archived' }
    }), 200)).toMatchObject({ id: moved.id, objectiveId: 'objective:archived' });
    const replayed = await call('/v1/pointron/tasks', { ...actors.pointronWrite, 'idempotency-key': 'archived-parent-1' }, {
      body: { label: 'Keyed under an archived goal', dateUnix: 1_700_000_000_000, objectiveId: 'objective:archived' }
    });
    expect(replayed.status).toBe(201);
    const again = await call('/v1/pointron/tasks', { ...actors.pointronWrite, 'idempotency-key': 'archived-parent-1' }, {
      body: { label: 'Keyed under an archived goal', dateUnix: 1_700_000_000_000, objectiveId: 'objective:archived' }
    });
    expect(again.status).toBe(201);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
  });

  it('lists a record under an archived parent only when it is archived itself, as the list description says', async () => {
    const spec = JSON.parse(readFileSync(new URL('../../openapi/pointron.json', import.meta.url), 'utf8')) as {
      paths: Record<string, { get?: { description?: string } }>;
    };
    const description = String(spec.paths['/v1/pointron/tasks']?.get?.description);
    expect(description).toContain('lists the records that are archived themselves');
    expect(description).toContain('A record under an archived parent that is not archived itself is left out of every list; read it by id.');
    const child = await json(await call('/v1/pointron/tasks', actors.pointronWrite, {
      body: { label: 'Listed nowhere', dateUnix: 1_700_000_000_000, objectiveId: 'objective:archived' }
    }), 201);
    const seeded = await call('/datafn/mutation', actors.cookie, {
      body: [insert('task', 'task:archived-child', {
        label: 'Archived child', dateUnix: 1_700_000_000_000, objectiveId: 'objective:archived', isArchived: true
      })]
    });
    expect(seeded.status).toBe(200);
    const archivedList = await ids(await call('/v1/pointron/tasks?isArchived=true&limit=100', actors.pointronWrite));
    expect(archivedList).toContain('task:archived-child');
    expect(archivedList).not.toContain(String(child.id));
    expect(await ids(await call('/v1/pointron/tasks?limit=100', actors.pointronWrite))).not.toContain(String(child.id));
    expect(await ids(await call('/v1/pointron/tasks?isArchived=false&limit=100', actors.pointronWrite)))
      .not.toContain(String(child.id));
    expect(await json(await call(`/v1/pointron/tasks/${String(child.id)}`, actors.pointronWrite), 200))
      .toMatchObject({ id: child.id, label: 'Listed nowhere', objectiveId: 'objective:archived' });
  });

  it('refuses a reference to a record that does not exist without writing', async () => {
    const missing = await problem(await call('/v1/pointron/tasks', actors.pointronWrite, {
      body: { label: 'Dangling task', dateUnix: 1_700_000_000_000, objectiveId: 'objective:does-not-exist' }
    }), 422, 'validation_failed');
    expect(missing.errors).toEqual([expect.objectContaining({ pointer: '/objectiveId' })]);
    const tasks = await json(await call('/v1/pointron/tasks?limit=100', actors.pointronWrite), 200);
    expect((tasks.data as Body[]).map((row) => row.label)).not.toContain('Dangling task');

    await problem(await call('/v1/pointron/tasks/task:t1', actors.pointronWrite, {
      method: 'PATCH',
      body: { label: 'Dangling rename', objectiveId: 'objective:does-not-exist' }
    }), 422, 'validation_failed');
    expect(await json(await call('/v1/pointron/tasks/task:t1', actors.pointronWrite), 200))
      .toMatchObject({ label: 'Alpha task' });

    await problem(await call('/v1/nucleum/collections', actors.nucleumWrite, {
      body: { label: 'Extends nothing', type: 'list', resource: 'node', typeToExtend: 'collection:missing' }
    }), 422, 'validation_failed');
    expect(await json(await call('/v1/nucleum/collections', actors.nucleumWrite, {
      body: { label: 'Extends notes', type: 'list', resource: 'node', typeToExtend: 'collection:notes' }
    }), 201)).toMatchObject({ typeToExtend: 'collection:notes' });
    expect(await json(await call('/v1/pointron/tasks', actors.pointronWrite, {
      body: { label: 'Under a goal', dateUnix: 1_700_000_000_000, objectiveId: 'objective:o1' }
    }), 201)).toMatchObject({ objectiveId: 'objective:o1' });
  });
});

describe('v1 writes on the real DataFn executor', () => {
  type Executor = SyncServer['executor'];

  /**
   * A router over the harness's DataFn executor. `beforeWrite` runs once just
   * before the write's DataFn call (after the router's own checks), so a
   * change it makes lands between them; `afterWrite` runs once after it.
   */
  function routerAround(
    app: InterfaceApp,
    hooks: { beforeWrite?: () => Promise<void>; failQueriesAfterWrite?: boolean }
  ) {
    let beforeWrite = hooks.beforeWrite ?? null;
    let written = false;
    const router = createInterfaceApiRouter(app, {
      authenticate: (request) => harness.services.auth.provider.authenticate(request),
      readStored: harness.services.readSyncRecord,
      getSyncServer: async () => {
        const executor = (await harness.services.getSyncServer()).executor;
        const wrapped: Executor = {
          schema: executor.schema,
          query: async (payload, context) => {
            if (written && hooks.failQueriesAfterWrite) {
              throw new DatafnExecutorError({ code: 'RATE_LIMITED', message: 'Too many requests' }, 429);
            }
            return executor.query(payload, context);
          },
          mutate: async <TResult>(payload: unknown, context?: SyncContext) => {
            const result = await executor.mutate<TResult>(payload, context);
            written = true;
            return result;
          },
          search: (payload, context) => executor.search(payload, context),
          transact: async <TResult>(payload: unknown, context?: SyncContext) => {
            const run = beforeWrite;
            beforeWrite = null;
            await run?.();
            const result = await executor.transact<TResult>(payload, context);
            written = true;
            return result;
          }
        };
        return { executor: wrapped } as unknown as SyncServer;
      }
    });
    return (path: string, headers: Headers, init: { method?: string; body?: unknown } = {}) =>
      router.handle(new Request(`${base}${path}`, {
        method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
        headers: { 'content-type': 'application/json', ...headers },
        body: init.body === undefined ? undefined : JSON.stringify(init.body)
      }));
  }

  async function seed(...mutations: Body[]): Promise<void> {
    const response = await call('/datafn/mutation', actors.cookie, { body: mutations });
    expect(response.status, await response.clone().text()).toBe(200);
  }

  /** The stored row, trashed or not, as the account's own session reads it. */
  async function stored(resource: string, id: string): Promise<Body | undefined> {
    const body = await json(await call('/datafn/query', actors.cookie, {
      body: { resource, version: 1, filters: { id: { eq: id } }, metadata: { includeTrashed: true, includeArchived: true, includeAncestorInactive: true } }
    }), 200) as { result: { data: Body[] } };
    return body.result.data.find((row) => row.id === id);
  }

  it.each([
    { change: 'trashed', operation: 'trash' },
    { change: 'deleted', operation: 'delete' }
  ])('answers 404 and leaves storage alone when the task is $change before the update lands', async ({ change, operation }) => {
    const id = `task:race-${change}`;
    await seed(insert('task', id, { label: 'Before the race', dateUnix: 1_700_000_000_000 }));
    let raced: Body | undefined;
    const send = routerAround('pointron', {
      beforeWrite: async () => {
        await seed(mutation('task', operation, id, {}));
        raced = await stored('task', id);
      }
    });
    await problem(await send(`/v1/pointron/tasks/${id}`, actors.pointronWrite, {
      method: 'PATCH', body: { label: 'Renamed in the race' }
    }), 404, 'not_found');
    const after = await stored('task', id);
    // A merge would have recreated the deleted row or renamed the trashed one.
    expect(after).toEqual(raced);
    if (operation === 'delete') {
      expect(after).toBeUndefined();
    } else {
      expect(after).toMatchObject({ label: 'Before the race', trashedAt: expect.any(Number) });
    }
  });

  it('answers 404 when a shared record stops being visible to the app before the update lands', async () => {
    const id = 'collection:race-type';
    await seed(insert('collection', id, { label: 'Notes in a race', type: 'list', resource: 'node' }));
    const send = routerAround('memotron', {
      beforeWrite: () => seed(mutation('collection', 'merge', id, { record: { resource: 'objective' } }))
    });
    await problem(await send(`/v1/memotron/collections/${id}`, actors.memotronWrite, {
      method: 'PATCH', body: { label: 'Renamed in the race' }
    }), 404, 'not_found');
    expect(await stored('collection', id)).toMatchObject({ label: 'Notes in a race', resource: 'objective' });
  });

  it('answers 409 and leaves storage alone when a reference the body leaves out moves before the update lands', async () => {
    const id = 'task:race-reference';
    await seed(insert('task', id, { label: 'Before the race', dateUnix: 1_700_000_000_000, objectiveId: 'objective:o1' }));
    const send = routerAround('pointron', {
      beforeWrite: () => seed(mutation('task', 'merge', id, { record: { objectiveId: 'objective:archived' } }))
    });
    await problem(await send(`/v1/pointron/tasks/${id}`, actors.pointronWrite, {
      method: 'PATCH', body: { label: 'Renamed in the race' }
    }), 409, 'conflict');
    expect(await stored('task', id)).toMatchObject({ label: 'Before the race' });
    // Without a race the same update applies and answers the reference it kept.
    const settled = await json(await call(`/v1/pointron/tasks/${id}`, actors.pointronWrite, {
      method: 'PATCH', body: { label: 'Renamed after the race' }
    }), 200);
    expect(settled).toMatchObject({ label: 'Renamed after the race', objectiveId: 'objective:archived' });
  });

  it('answers a stored create and update with the committed record when every later read is refused', async () => {
    const send = routerAround('pointron', { failQueriesAfterWrite: true });
    const created = await send('/v1/pointron/tasks', actors.pointronWrite, {
      body: { label: 'Committed', dateUnix: 1_700_000_000_000, objectiveId: 'objective:o1' }
    });
    const record = await json(created, 201);
    expect(created.headers.get('location')).toBe(`/v1/pointron/tasks/${encodeURIComponent(String(record.id))}`);
    expect(record).toEqual(await json(await call(`/v1/pointron/tasks/${String(record.id)}`, actors.pointronWrite), 200));
    expect(record).toMatchObject({ label: 'Committed', objectiveId: 'objective:o1', createdAt: expect.any(Number) });

    const update = routerAround('pointron', { failQueriesAfterWrite: true });
    // The router's existence check runs before the write; only reads after it are refused.
    const updated = await json(await update(`/v1/pointron/tasks/${String(record.id)}`, actors.pointronWrite, {
      method: 'PATCH', body: { isChecked: true }
    }), 200);
    expect(updated).toEqual(await json(await call(`/v1/pointron/tasks/${String(record.id)}`, actors.pointronWrite), 200));
    expect(updated).toMatchObject({ isChecked: true, completedAtUnix: expect.any(Number), objectiveId: 'objective:o1' });
  });

  it('refuses writes while the account has end-to-end encryption on and leaves the stored record alone', async () => {
    const id = 'task:encrypted';
    await seed(insert('task', id, { label: 'example-ciphertext', dateUnix: 1_700_000_000_000 }));
    // The setting as the apps store it: DataFn KV key nucleum:e2ee.
    const setting = (enabled: boolean) =>
      mutation('kv', 'merge', 'kv:nucleum:e2ee', { record: { value: { version: 1, enabled, updatedAt: 1 } } });
    await seed(setting(true));
    try {
      await problem(await call(`/v1/pointron/tasks/${id}`, actors.pointronWrite, {
        method: 'PATCH', body: { label: 'Plaintext label' }
      }), 409, 'end_to_end_encrypted');
      await problem(await call('/v1/pointron/tasks', actors.pointronWrite, {
        body: { label: 'Plaintext label', dateUnix: 1_700_000_000_000 }
      }), 409, 'end_to_end_encrypted');
      expect(await stored('task', id)).toMatchObject({ label: 'example-ciphertext' });
      const plaintext = await json(await call('/datafn/query', actors.cookie, {
        body: { resource: 'task', version: 1, filters: { label: { eq: 'Plaintext label' } } }
      }), 200) as { result: { data: Body[] } };
      expect(plaintext.result.data).toEqual([]);
    } finally {
      await seed(setting(false));
    }
    expect(await json(await call(`/v1/pointron/tasks/${id}`, actors.pointronWrite, {
      method: 'PATCH', body: { label: 'Writable again' }
    }), 200)).toMatchObject({ label: 'Writable again' });
  });

  it('answers a space update with only the items the app may see', async () => {
    const memotron = await json(await call('/v1/memotron/spaces/space:mixed', actors.memotronWrite, {
      method: 'PATCH', body: { isStarred: true }
    }), 200);
    expect((memotron.items as Body[]).map((item) => item.id)).toEqual(['item-node']);
    const nucleum = await json(await call('/v1/nucleum/spaces/space:mixed', actors.nucleumWrite, {
      method: 'PATCH', body: { isStarred: false }
    }), 200);
    expect((nucleum.items as Body[]).map((item) => item.id)).toEqual(['item-node', 'item-goal']);
  });

  it('reads a write back only within the caller\'s namespace', async () => {
    const other = await signUpActor('v1-api-namespace@example.test');
    const id = 'task:namespaced';
    const seeded = await call('/datafn/mutation', other.cookie, {
      body: [insert('task', id, { label: 'Namespaced', dateUnix: 1_700_000_000_000 })]
    });
    expect(seeded.status, await seeded.clone().text()).toBe(200);
    const own = await harness.services.readSyncRecord('task', id, resolveAccountUserNamespace(other.actorId));
    expect(own).toMatchObject({ id, label: 'Namespaced' });
    expect(own).not.toHaveProperty('__ns');
    expect(await harness.services.readSyncRecord('task', id, resolveAccountUserNamespace('another-account'))).toBeNull();
  });
});
