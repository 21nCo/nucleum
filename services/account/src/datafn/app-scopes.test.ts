import { beforeAll, describe, expect, it } from 'vitest';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { resourceOwnership } from './resource-ownership.js';

const base = 'http://127.0.0.1:8787';
const json = { 'content-type': 'application/json' };

type Headers = Record<string, string>;

interface Actors {
  cookie: Headers;
  nucleum: Headers;
  star: Headers;
  memotronRead: Headers;
  memotronWrite: Headers;
  pointron: Headers;
  unscoped: Headers;
}

let harness: AccountTestHarness;
let actors: Actors;
let sequence = 0;

const objectiveItem = {
  id: 'item-objective',
  type: 'resource',
  resourceType: 'objective',
  resourceId: 'objective:o1',
  label: 'Goal'
};
const nodeItem = {
  id: 'item-node',
  type: 'resource',
  resourceType: 'node',
  resourceId: 'node:n1',
  label: 'Note'
};
const pageItem = { id: 'item-page', type: 'page', path: 'library/objective/all', label: 'Goals' };
const sectionItem = {
  id: 'item-section',
  type: 'section',
  label: 'Mixed',
  children: [
    { ...objectiveItem, id: 'item-section-objective' },
    { ...nodeItem, id: 'item-section-node' }
  ]
};
const nodeWithObjectiveChild = {
  ...nodeItem,
  id: 'item-node-parent',
  children: [{ ...objectiveItem, id: 'item-nested-objective' }]
};

async function call(path: string, headers: Headers, body?: unknown): Promise<Response> {
  return harness.app.fetch(new Request(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...json, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  }));
}

async function signUp(): Promise<Headers> {
  const response = await call('/auth/sign-up/password', { origin: base }, {
    email: 'scopes@example.test',
    password: 'Sup3r-secret-pass!',
    sessionMode: 'hybrid'
  });
  expect(response.status).toBe(200);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
  const csrf = cookies.find((cookie) => cookie.startsWith('nucleus.csrf='))?.split('=')[1];
  expect(csrf).toBeTruthy();
  return { cookie: cookies.join('; '), 'x-authfn-csrf': csrf ?? '', origin: base };
}

async function createKey(cookie: Headers, scopes: string[]): Promise<Headers> {
  const response = await call('/auth/api-keys', cookie, { name: scopes.join(' ') || 'none', scopes });
  expect(response.status).toBe(201);
  const body = await response.json() as { data: { secret: string } };
  return { authorization: `Bearer ${body.data.secret}` };
}

function mutation(
  resource: string,
  operation: string,
  id: string,
  record?: Record<string, unknown>
): Record<string, unknown> {
  sequence += 1;
  return {
    resource,
    version: 1,
    operation,
    id,
    ...(record ? { record } : {}),
    clientId: 'scope-test',
    mutationId: `scope-test-${sequence}`
  };
}

function push(...mutations: Record<string, unknown>[]) {
  return { clientId: 'scope-test', mutations };
}

async function rows(response: Response): Promise<Record<string, unknown>[]> {
  expect(response.status).toBe(200);
  const body = await response.json() as { result: { data: Record<string, unknown>[] } };
  return body.result.data;
}

async function ids(response: Response): Promise<string[]> {
  return (await rows(response)).map((row) => String(row.id)).sort();
}

async function storedLabel(resource: string, id: string): Promise<unknown> {
  const response = await call('/datafn/query', actors.cookie, {
    resource,
    version: 1,
    filters: { id: { eq: id } }
  });
  return (await rows(response))[0]?.label;
}

beforeAll(async () => {
  harness = createAccountTestHarness({ enableRateLimit: false });
  const cookie = await signUp();
  actors = {
    cookie,
    nucleum: await createKey(cookie, ['nucleum:*']),
    star: await createKey(cookie, ['*']),
    memotronRead: await createKey(cookie, ['memotron:read']),
    memotronWrite: await createKey(cookie, ['memotron:read', 'memotron:write']),
    pointron: await createKey(cookie, ['pointron:*']),
    unscoped: await createKey(cookie, [])
  };
  const seeded = await call('/datafn/mutation', cookie, [
    mutation('node', 'insert', 'node:n1', { label: 'Note', contentType: 'text' }),
    mutation('objective', 'insert', 'objective:o1', { label: 'Goal', type: 'goal', status: 'active' }),
    mutation('collection', 'insert', 'collection:notes', { label: 'Notes', type: 'list', resource: 'node' }),
    mutation('collection', 'insert', 'collection:goals', { label: 'Goals', type: 'list', resource: 'objective' }),
    mutation('view', 'insert', 'view:v1', { label: 'Board', layout: 'board' }),
    mutation('linkTag', 'insert', 'linkTag:t1', { label: 'Tag' }),
    mutation('space', 'insert', 'space:mixed', {
      label: 'Mixed',
      view: 'sidenav',
      items: [nodeItem, objectiveItem, pageItem, sectionItem, nodeWithObjectiveChild]
    }),
    mutation('space', 'insert', 'space:notes', { label: 'Notes', view: 'sidenav', items: [nodeItem] })
  ]);
  expect(seeded.status).toBe(200);
});

describe('resource ownership', () => {
  it('derives each app table set from the product features', () => {
    expect(resourceOwnership.tables.memotron.has('node')).toBe(true);
    expect(resourceOwnership.tables.memotron.has('objective')).toBe(false);
    expect(resourceOwnership.tables.pointron.has('objective')).toBe(true);
    expect(resourceOwnership.tables.pointron.has('node')).toBe(false);
    expect(resourceOwnership.shared.get('collection')).toEqual({ kind: 'field', field: 'resource' });
    expect(resourceOwnership.shared.get('property')).toEqual({ kind: 'field', field: 'resource' });
    expect(resourceOwnership.shared.get('space')).toEqual({ kind: 'items', field: 'items' });
    expect(resourceOwnership.shared.has('node')).toBe(false);
  });
});

describe('cookie and nucleum sessions are unchanged', () => {
  for (const actor of ['cookie', 'nucleum', 'star'] as const) {
    it(`${actor} reads every app, unfiltered shared resources and full spaces`, async () => {
      const headers = actors[actor];
      expect(await ids(await call('/datafn/query', headers, { resource: 'objective', version: 1 })))
        .toEqual(['objective:o1']);
      expect(await ids(await call('/datafn/query', headers, { resource: 'node', version: 1 })))
        .toContain('node:n1');
      expect(await ids(await call('/datafn/query', headers, { resource: 'collection', version: 1 })))
        .toEqual(['collection:goals', 'collection:notes']);
      expect(await ids(await call('/datafn/query', headers, { resource: 'view', version: 1 })))
        .toEqual(['view:v1']);
      const spaces = await rows(await call('/datafn/query', headers, {
        resource: 'space',
        version: 1,
        filters: { id: { eq: 'space:mixed' } }
      }));
      expect(spaces[0]?.items).toEqual([nodeItem, objectiveItem, pageItem, sectionItem, nodeWithObjectiveChild]);
    });
  }

  it('nucleum token pushes to any app', async () => {
    const response = await call('/datafn/push', actors.nucleum, push(
      mutation('objective', 'merge', 'objective:o1', { label: 'Goal by nucleum' })
    ));
    expect(response.status).toBe(200);
    expect(await storedLabel('objective', 'objective:o1')).toBe('Goal by nucleum');
  });

  it('nucleum token may still sync the whole namespace', async () => {
    const response = await call('/datafn/clone', actors.nucleum, {
      clientId: 'scope-test',
      resources: ['node']
    });
    expect(response.status).not.toBe(403);
  });
});

describe('memotron token reading another app', () => {
  it('reads its own resources', async () => {
    expect(await ids(await call('/datafn/query', actors.memotronRead, { resource: 'node', version: 1 })))
      .toContain('node:n1');
  });

  it('cannot query a Pointron resource', async () => {
    const response = await call('/datafn/query', actors.memotronRead, { resource: 'objective', version: 1 });
    expect(response.status).toBe(403);
  });

  it('cannot hide a Pointron query in a batch or a transact step', async () => {
    const batch = await call('/datafn/query', actors.memotronRead, [
      { resource: 'node', version: 1 },
      { resource: 'objective', version: 1 }
    ]);
    expect(batch.status).toBe(403);
    const transact = await call('/datafn/transact', actors.memotronRead, {
      steps: [{ query: { resource: 'objective', version: 1 } }]
    });
    expect(transact.status).toBe(403);
  });

  it('cannot reach Pointron records through a relation', async () => {
    const response = await call('/datafn/query', actors.memotronRead, {
      resource: 'collection',
      version: 1,
      relation: 'items',
      id: 'collection:goals'
    });
    expect(response.status).toBe(403);
  });

  it('cannot search Pointron resources or search without naming resources', async () => {
    expect((await call('/datafn/search', actors.memotronRead, {
      query: 'Goal',
      resources: ['objective']
    })).status).toBe(403);
    expect((await call('/datafn/search', actors.memotronRead, { query: 'Goal' })).status).toBe(403);
    expect((await call('/datafn/search', actors.memotronRead, {
      query: 'Note',
      resources: ['node']
    })).status).toBe(200);
  });

  it('cannot sync the whole namespace', async () => {
    for (const path of ['/datafn/clone', '/datafn/pull']) {
      const response = await call(path, actors.memotronRead, { clientId: 'scope-test', resources: ['node'] });
      expect(response.status).toBe(403);
    }
  });

  it('cannot create a share link that would expose another app', async () => {
    const response = await call('/datafn/public-links', actors.memotronWrite, {
      resource: 'objective',
      recordId: 'objective:o1',
      scope: 'record',
      level: 'viewer'
    });
    expect([401, 403]).toContain(response.status);
  });
});

describe('memotron token reading shared resources', () => {
  it('sees collections filtered to Memotron resources', async () => {
    const response = await call('/datafn/query', actors.memotronRead, {
      resource: 'collection',
      version: 1,
      filters: { resource: { in: ['node'] } }
    });
    expect(await ids(response)).toEqual(['collection:notes']);
  });

  it('cannot read collections without the resource filter', async () => {
    const response = await call('/datafn/query', actors.memotronRead, { resource: 'collection', version: 1 });
    expect(response.status).toBe(403);
  });

  it('cannot read collections pointing at a Pointron resource', async () => {
    for (const filters of [
      { resource: { eq: 'objective' } },
      { resource: { in: ['node', 'objective'] } },
      { $or: [{ resource: 'node' }, { resource: 'objective' }] }
    ]) {
      const response = await call('/datafn/query', actors.memotronRead, { resource: 'collection', version: 1, filters });
      expect(response.status).toBe(403);
    }
  });

  it('cannot read views or link tags, which carry nothing to filter by', async () => {
    for (const resource of ['view', 'linkTag']) {
      const response = await call('/datafn/query', actors.memotronRead, { resource, version: 1 });
      expect(response.status).toBe(403);
    }
  });

  it('sees space items filtered to Memotron resources, including nested items', async () => {
    const spaces = await rows(await call('/datafn/query', actors.memotronRead, {
      resource: 'space',
      version: 1,
      filters: { id: { eq: 'space:mixed' } }
    }));
    expect(spaces[0]?.items).toEqual([
      nodeItem,
      pageItem,
      { ...sectionItem, children: [{ ...nodeItem, id: 'item-section-node' }] },
      { ...nodeWithObjectiveChild, children: [] }
    ]);
  });

  it('sees filtered space items through batched queries and transact steps', async () => {
    const batch = await call('/datafn/query', actors.memotronRead, [
      { resource: 'node', version: 1 },
      { resource: 'space', version: 1, filters: { id: { eq: 'space:mixed' } } }
    ]);
    expect(batch.status).toBe(200);
    const batchBody = await batch.json() as { result: { data: { items: unknown[] }[] }[] };
    expect(JSON.stringify(batchBody.result[1]?.data)).not.toContain('objective:o1');
    const transact = await call('/datafn/transact', actors.memotronRead, {
      steps: [{ query: { resource: 'space', version: 1, filters: { id: { eq: 'space:mixed' } } } }]
    });
    expect(transact.status).toBe(200);
    const transactBody = await transact.json() as { result: { results: unknown[] } };
    expect(JSON.stringify(transactBody.result.results)).not.toContain('objective:o1');
    expect(JSON.stringify(transactBody.result.results)).toContain('item-section-node');
  });

  it('cannot probe hidden space items through filters or sort', async () => {
    const filtered = await call('/datafn/query', actors.memotronRead, {
      resource: 'space',
      version: 1,
      filters: { items: { contains: 'objective' } }
    });
    expect(filtered.status).toBe(403);
    const sorted = await call('/datafn/query', actors.memotronRead, {
      resource: 'space',
      version: 1,
      sort: ['items:asc']
    });
    expect(sorted.status).toBe(403);
  });
});

describe('read-only token pushing', () => {
  it('cannot push or mutate even its own app resources', async () => {
    const pushed = await call('/datafn/push', actors.memotronRead, push(
      mutation('node', 'insert', 'node:read-only', { label: 'Nope', contentType: 'text' })
    ));
    expect(pushed.status).toBe(403);
    const mutated = await call('/datafn/mutation', actors.memotronRead,
      mutation('node', 'merge', 'node:n1', { label: 'Nope' }));
    expect(mutated.status).toBe(403);
    expect(await storedLabel('node', 'node:n1')).toBe('Note');
  });
});

describe('memotron write token pushing', () => {
  it('pushes its own resources', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('node', 'insert', 'node:n2', { label: 'Pushed', contentType: 'text' })
    ));
    expect(response.status).toBe(200);
    expect(await storedLabel('node', 'node:n2')).toBe('Pushed');
  });

  it('cannot push a Pointron resource, alone or inside a batch', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('node', 'merge', 'node:n2', { label: 'Batched' }),
      mutation('objective', 'merge', 'objective:o1', { label: 'Hijacked' })
    ));
    expect(response.status).toBe(403);
    expect(await storedLabel('objective', 'objective:o1')).not.toBe('Hijacked');
    expect(await storedLabel('node', 'node:n2')).toBe('Pushed');
  });

  it('updates a shared collection that points at a Memotron resource', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('collection', 'merge', 'collection:notes', { label: 'Notes renamed' })
    ));
    expect(response.status).toBe(200);
    expect(await storedLabel('collection', 'collection:notes')).toBe('Notes renamed');
  });

  it('cannot update or delete a shared collection pointing at a Pointron resource', async () => {
    for (const change of [
      mutation('collection', 'merge', 'collection:goals', { label: 'Hijacked' }),
      mutation('collection', 'merge', 'collection:goals', { resource: 'node' }),
      mutation('collection', 'delete', 'collection:goals')
    ]) {
      const response = await call('/datafn/push', actors.memotronWrite, push(change));
      expect(response.status).toBe(403);
    }
    expect(await storedLabel('collection', 'collection:goals')).toBe('Goals');
  });

  it('cannot create or repoint a shared collection at a Pointron resource', async () => {
    const created = await call('/datafn/push', actors.memotronWrite, push(
      mutation('collection', 'insert', 'collection:sneaky', { label: 'Sneaky', type: 'list', resource: 'objective' })
    ));
    expect(created.status).toBe(403);
    const repointed = await call('/datafn/push', actors.memotronWrite, push(
      mutation('collection', 'merge', 'collection:notes', { resource: 'objective' })
    ));
    expect(repointed.status).toBe(403);
  });

  it('cannot write a space whose items point at Pointron resources', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('space', 'merge', 'space:notes', { items: [nodeItem, objectiveItem] })
    ));
    expect(response.status).toBe(403);
    const replaced = await call('/datafn/push', actors.memotronWrite, push(
      mutation('space', 'merge', 'space:mixed', { items: [nodeItem] })
    ));
    expect(replaced.status).toBe(403);
  });

  it('renames a space and rewrites items it can fully see', async () => {
    const renamed = await call('/datafn/push', actors.memotronWrite, push(
      mutation('space', 'merge', 'space:mixed', { label: 'Mixed renamed' })
    ));
    expect(renamed.status).toBe(200);
    const rewritten = await call('/datafn/push', actors.memotronWrite, push(
      mutation('space', 'merge', 'space:notes', { items: [nodeItem, pageItem] })
    ));
    expect(rewritten.status).toBe(200);
  });

  it('cannot write views or link tags', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('view', 'merge', 'view:v1', { label: 'Hijacked' })
    ));
    expect(response.status).toBe(403);
  });

  it('cannot link its records to Pointron records', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push({
      ...mutation('node', 'relate', 'node:n1'),
      relation: 'links',
      targetId: 'objective:o1'
    }));
    expect(response.status).toBe(403);
  });
});

describe('pointron token', () => {
  it('reads Pointron resources and not Memotron ones', async () => {
    expect(await ids(await call('/datafn/query', actors.pointron, { resource: 'objective', version: 1 })))
      .toEqual(['objective:o1']);
    expect((await call('/datafn/query', actors.pointron, { resource: 'node', version: 1 })).status).toBe(403);
    expect(await ids(await call('/datafn/query', actors.pointron, {
      resource: 'collection',
      version: 1,
      filters: { resource: 'objective' }
    }))).toEqual(['collection:goals']);
  });

  it('sees space items filtered to Pointron resources', async () => {
    const spaces = await rows(await call('/datafn/query', actors.pointron, {
      resource: 'space',
      version: 1,
      filters: { id: { eq: 'space:mixed' } }
    }));
    expect(spaces[0]?.items).toEqual([
      objectiveItem,
      pageItem,
      { ...sectionItem, children: [{ ...objectiveItem, id: 'item-section-objective' }] }
    ]);
  });

  it('pushes Pointron resources and not Memotron ones', async () => {
    const own = await call('/datafn/push', actors.pointron, push(
      mutation('objective', 'merge', 'objective:o1', { label: 'Goal by pointron' })
    ));
    expect(own.status).toBe(200);
    const other = await call('/datafn/push', actors.pointron, push(
      mutation('node', 'merge', 'node:n1', { label: 'Hijacked' })
    ));
    expect(other.status).toBe(403);
    expect(await storedLabel('node', 'node:n1')).toBe('Note');
  });
});

describe('token without scopes', () => {
  it('cannot read or push anything', async () => {
    expect((await call('/datafn/query', actors.unscoped, { resource: 'node', version: 1 })).status).toBe(403);
    const pushed = await call('/datafn/push', actors.unscoped, push(
      mutation('node', 'merge', 'node:n1', { label: 'Nope' })
    ));
    expect(pushed.status).toBe(403);
  });
});
