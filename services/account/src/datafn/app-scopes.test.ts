import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { nucleumDatafnSchema } from '@nucleum/schema/datafn';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { filterScopedResponseBody } from './app-scopes.js';
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

/** Builds a throwaway sign-up credential at runtime that meets the password policy. */
function generateCredential(): string {
  return [randomUUID().toUpperCase(), randomUUID(), '!'].join('');
}

async function signUp(): Promise<Headers> {
  const credential = generateCredential();
  const response = await call('/auth/sign-up/password', { origin: base }, {
    email: 'scopes@example.test',
    password: credential,
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

function relationMutation(
  resource: string,
  operation: string,
  id: string,
  relations: Record<string, unknown>,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { ...mutation(resource, operation, id), relations, ...extra };
}

async function joinRows(model: string): Promise<Record<string, unknown>[]> {
  return harness.datafnDatabase.findMany<Record<string, unknown>>({ model, where: [] });
}

async function linkTargets(id: string): Promise<string[]> {
  return (await joinRows('record_links'))
    .filter((link) => link.in === id)
    .map((link) => String(link.out))
    .sort();
}

async function linkTags(from: string, to: string): Promise<unknown> {
  return (await joinRows('record_links')).find((link) => link.in === from && link.out === to)?.tags;
}

async function storedField(resource: string, id: string, field: string): Promise<unknown> {
  const response = await call('/datafn/query', actors.cookie, {
    resource,
    version: 1,
    filters: { id: { eq: id } }
  });
  return (await rows(response))[0]?.[field];
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
    mutation('space', 'insert', 'space:notes', { label: 'Notes', view: 'sidenav', items: [nodeItem] }),
    mutation('node', 'insert', 'node:n3', { label: 'Other note', contentType: 'text' }),
    mutation('objective', 'insert', 'objective:o2', { label: 'Other goal', type: 'goal', status: 'active' }),
    ...['notes', 'goals', 'both'].map((name) =>
      mutation('view', 'insert', `view:${name}`, { label: name, layout: 'list' })),
    ...['memo', 'point', 'shared', 'cross'].map((name) =>
      mutation('linkTag', 'insert', `linkTag:${name}`, { label: name })),
    relationMutation('collection', 'relate', 'collection:notes', {
      views: ['view:notes', 'view:both']
    }),
    relationMutation('collection', 'relate', 'collection:goals', {
      views: ['view:goals', 'view:both']
    }),
    relationMutation('node', 'relate', 'node:n1', {
      links: [
        { $ref: 'node:n3', linkType: 'direct', tags: ['linkTag:memo', 'linkTag:shared'] },
        { $ref: 'objective:o1', linkType: 'direct', tags: ['linkTag:cross'] }
      ]
    }),
    relationMutation('objective', 'relate', 'objective:o1', {
      links: [{ $ref: 'objective:o2', linkType: 'direct', tags: ['linkTag:point', 'linkTag:shared'] }]
    })
  ]);
  expect(seeded.status).toBe(200);
  expect(await linkTargets('node:n1')).toEqual(['node:n3', 'objective:o1']);
  expect((await joinRows('collection_views')).length).toBe(4);
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
    expect(resourceOwnership.shared.get('view')).toEqual({
      kind: 'collections',
      joinTable: 'collection_views',
      collectionColumn: 'collectionId',
      recordColumn: 'viewId'
    });
    expect(resourceOwnership.shared.get('linkTag')).toMatchObject({
      kind: 'linkTags',
      joinTable: 'record_links'
    });
    expect(resourceOwnership.shared.has('node')).toBe(false);
  });
});

describe('cookie and nucleum sessions are unchanged', () => {
  for (const actor of ['cookie', 'nucleum', 'star'] as const) {
    it(`${actor} reads every app, unfiltered shared resources and full spaces`, async () => {
      const headers = actors[actor];
      expect(await ids(await call('/datafn/query', headers, { resource: 'objective', version: 1 })))
        .toEqual(['objective:o1', 'objective:o2']);
      expect(await ids(await call('/datafn/query', headers, { resource: 'node', version: 1 })))
        .toContain('node:n1');
      expect(await ids(await call('/datafn/query', headers, { resource: 'collection', version: 1 })))
        .toEqual(['collection:goals', 'collection:notes']);
      expect(await ids(await call('/datafn/query', headers, { resource: 'view', version: 1 })))
        .toEqual(['view:both', 'view:goals', 'view:notes', 'view:v1']);
      expect(await ids(await call('/datafn/query', headers, { resource: 'linkTag', version: 1 })))
        .toEqual(['linkTag:cross', 'linkTag:memo', 'linkTag:point', 'linkTag:shared', 'linkTag:t1']);
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

  it('sees views linked to at least one Memotron collection', async () => {
    expect(await ids(await call('/datafn/query', actors.memotronRead, { resource: 'view', version: 1 })))
      .toEqual(['view:both', 'view:notes']);
    expect(await ids(await call('/datafn/query', actors.memotronRead, {
      resource: 'view',
      version: 1,
      filters: { id: { eq: 'view:goals' } }
    }))).toEqual([]);
  });

  it('sees link tags used on a link between Memotron records', async () => {
    expect(await ids(await call('/datafn/query', actors.memotronRead, { resource: 'linkTag', version: 1 })))
      .toEqual(['linkTag:memo', 'linkTag:shared']);
  });

  it('sees filtered views and link tags through batched queries and transact steps', async () => {
    const batch = await call('/datafn/query', actors.memotronRead, [
      { resource: 'node', version: 1 },
      { resource: 'view', version: 1 }
    ]);
    expect(batch.status).toBe(200);
    const batchBody = await batch.json() as { result: { data: { id: string }[] }[] };
    expect(batchBody.result[1]?.data.map((row) => row.id).sort()).toEqual(['view:both', 'view:notes']);
    const transact = await call('/datafn/transact', actors.memotronRead, {
      steps: [{ query: { resource: 'linkTag', version: 1 } }]
    });
    expect(transact.status).toBe(200);
    const text = JSON.stringify(await transact.json());
    expect(text).toContain('linkTag:memo');
    expect(text).not.toContain('linkTag:point');
    expect(text).not.toContain('linkTag:cross');
  });

  it('cannot summarize or reach views and link tags around the filter', async () => {
    for (const query of [
      { resource: 'view', version: 1, groupBy: ['layout'] },
      { resource: 'linkTag', version: 1, count: true },
      { resource: 'view', version: 1, sort: ['label:asc'], limit: 1 },
      { resource: 'view', version: 1, filters: { 'collections.resource': 'objective' } },
      { resource: 'collection', version: 1, relation: 'views', id: 'collection:goals' },
      { resource: 'view', version: 1, filters: 'id' }
    ]) {
      const response = await call('/datafn/query', actors.memotronRead, query);
      expect(response.status).toBe(403);
    }
    expect((await call('/datafn/search', actors.memotronRead, {
      query: 'goals',
      resources: ['view']
    })).status).toBe(403);
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

  it('cannot page by items with the descending shorthand or any other sort spelling', async () => {
    const pagedBy = (sort: unknown) => ({ resource: 'space', version: 1, sort, limit: 1 });
    for (const sort of [
      ['-items', 'id:asc'],
      ['-items.0', 'id:asc'],
      [{ field: 'items', direction: 'desc' }, 'id:asc'],
      '-items',
      ['id:sideways']
    ]) {
      expect((await call('/datafn/query', actors.memotronRead, pagedBy(sort))).status).toBe(403);
    }
    const leak = pagedBy(['-items', 'id:asc']);
    expect((await call('/datafn/query', actors.memotronRead, [{ resource: 'node', version: 1 }, leak]))
      .status).toBe(403);
    expect((await call('/datafn/transact', actors.memotronRead, { steps: [{ query: leak }] })).status)
      .toBe(403);
    expect((await call('/datafn/query', actors.pointron, leak)).status).toBe(403);
  });

  it('pages spaces by other fields without a cursor carrying hidden items', async () => {
    const paged = { resource: 'space', version: 1, sort: ['label:asc', 'id:asc'], limit: 1 };
    for (const response of [
      await call('/datafn/query', actors.memotronRead, paged),
      await call('/datafn/transact', actors.memotronRead, { steps: [{ query: paged }] })
    ]) {
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('nextCursor');
      expect(text).toContain('space:mixed');
      expect(text).not.toContain('objective:o1');
    }
  });

  it('drops a page cursor that would carry unfiltered items', async () => {
    const store = { findMany: async () => [] };
    const body = {
      ok: true,
      result: {
        data: [{ id: 'space:mixed', items: [nodeItem, objectiveItem] }],
        nextCursor: { items: [nodeItem, objectiveItem], id: 'space:mixed' }
      }
    };
    const filtered = await filterScopedResponseBody(
      'query',
      { resource: 'space', version: 1, limit: 1 },
      body,
      new Set(['memotron'] as const),
      store,
      nucleumDatafnSchema
    );
    expect(filtered).toEqual({
      ok: true,
      result: { data: [{ id: 'space:mixed', items: [nodeItem] }], nextCursor: null }
    });
    const transact = await filterScopedResponseBody(
      'transact',
      { steps: [{ query: { resource: 'space', version: 1, limit: 1 } }] },
      { ok: true, result: { results: [body.result] } },
      new Set(['memotron'] as const),
      store,
      nucleumDatafnSchema
    );
    expect(JSON.stringify(transact)).not.toContain('objective:o1');
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

  it('writes views only when every linked collection is Memotron', async () => {
    const own = await call('/datafn/push', actors.memotronWrite, push(
      mutation('view', 'merge', 'view:notes', { label: 'Notes board' })
    ));
    expect(own.status).toBe(200);
    expect(await storedLabel('view', 'view:notes')).toBe('Notes board');
    for (const change of [
      mutation('view', 'merge', 'view:both', { label: 'Hijacked' }),
      mutation('view', 'merge', 'view:goals', { label: 'Hijacked' }),
      mutation('view', 'delete', 'view:both')
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
    }
    expect(await storedLabel('view', 'view:both')).toBe('both');
  });

  it('creates a view and links it only to Memotron collections', async () => {
    const created = await call('/datafn/push', actors.memotronWrite, push(
      mutation('view', 'insert', 'view:new', { label: 'New', layout: 'list' }),
      relationMutation('collection', 'relate', 'collection:notes', { views: ['view:new'] })
    ));
    expect(created.status).toBe(200);
    for (const change of [
      relationMutation('collection', 'relate', 'collection:goals', { views: ['view:new'] }),
      relationMutation('view', 'relate', 'view:new', { collections: ['collection:goals'] }),
      relationMutation('collection', 'relate', 'collection:notes', { views: ['view:goals'] }),
      relationMutation('collection', 'unrelate', 'collection:notes', { views: ['view:both'] })
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
    }
    const links = (await joinRows('collection_views'))
      .filter((link) => link.viewId === 'view:new' || link.viewId === 'view:goals')
      .map((link) => `${String(link.collectionId)}>${String(link.viewId)}`)
      .sort();
    expect(links).toEqual(['collection:goals>view:goals', 'collection:notes>view:new']);
    expect((await joinRows('collection_views')).some((link) =>
      link.collectionId === 'collection:notes' && link.viewId === 'view:both')).toBe(true);
  });

  it('writes link tags only when every tagged link is between Memotron records', async () => {
    const own = await call('/datafn/push', actors.memotronWrite, push(
      mutation('linkTag', 'merge', 'linkTag:memo', { label: 'memo renamed' }),
      mutation('linkTag', 'insert', 'linkTag:new', { label: 'new' })
    ));
    expect(own.status).toBe(200);
    for (const id of ['linkTag:shared', 'linkTag:point', 'linkTag:cross']) {
      const response = await call('/datafn/push', actors.memotronWrite, push(
        mutation('linkTag', 'merge', id, { label: 'Hijacked' })
      ));
      expect(response.status).toBe(403);
    }
    expect(await storedLabel('linkTag', 'linkTag:shared')).toBe('shared');
  });

  it('cannot relate its records to Pointron records through any relation key', async () => {
    const crossApp = relationMutation('node', 'relate', 'node:n3', {
      links: [{ $ref: 'objective:o1' }],
      collections: [{ $ref: 'collection:goals' }]
    }, { relation: 'parent' });
    expect((await call('/datafn/push', actors.memotronWrite, push(crossApp))).status).toBe(403);
    expect((await call('/datafn/mutation', actors.memotronWrite, crossApp)).status).toBe(403);
    const transact = await call('/datafn/transact', actors.memotronWrite, {
      steps: [{ mutation: relationMutation('node', 'relate', 'node:n3', { links: ['objective:o2'] }) }]
    });
    expect(transact.status).toBe(403);
    const inserted = await call('/datafn/push', actors.memotronWrite, push({
      ...mutation('node', 'insert', 'node:linked', { label: 'Linked', contentType: 'text' }),
      relations: { links: ['objective:o1'] }
    }));
    expect(inserted.status).toBe(403);
    expect(await linkTargets('node:n3')).toEqual([]);
    expect((await joinRows('collection_items')).filter((row) => row.itemId === 'node:n3')).toEqual([]);
    expect(await storedLabel('node', 'node:linked')).toBeUndefined();
  });

  it('relates, retags and unrelates Memotron records with real client payloads', async () => {
    const related = await call('/datafn/push', actors.memotronWrite, push(
      relationMutation('node', 'relate', 'node:n3', { parent: 'node:n1' }),
      relationMutation('node', 'relate', 'node:n3', {
        links: [{ $ref: 'node:n1', fromResource: 'node', toResource: 'node', linkType: 'direct' }]
      }),
      relationMutation('node', 'relate', 'node:n3', { collections: ['collection:notes'] })
    ));
    expect(related.status).toBe(200);
    expect(await storedField('node', 'node:n3', 'parent')).toBe('node:n1');
    expect(await linkTargets('node:n3')).toEqual(['node:n1']);
    const retagged = await call('/datafn/push', actors.memotronWrite, push(
      relationMutation('node', 'modifyRelation', 'node:n1', {
        links: [{
          $ref: 'node:n3',
          fromResource: 'node',
          toResource: 'node',
          linkType: 'direct',
          tags: ['linkTag:memo', 'linkTag:shared', 'linkTag:new']
        }]
      })
    ));
    expect(retagged.status).toBe(200);
    expect(await linkTags('node:n1', 'node:n3'))
      .toEqual(['linkTag:memo', 'linkTag:shared', 'linkTag:new']);
    const unrelated = await call('/datafn/push', actors.memotronWrite, push(
      relationMutation('node', 'unrelate', 'node:n3', {
        links: [{ $ref: 'node:n1', linkType: 'direct' }]
      }),
      relationMutation('node', 'unrelate', 'node:n3', { collections: ['collection:notes'] })
    ));
    expect(unrelated.status).toBe(200);
    expect(await linkTargets('node:n3')).toEqual([]);
  });

  it('cannot retag or unlink a link to a Pointron record or apply a Pointron-only tag', async () => {
    for (const change of [
      relationMutation('node', 'modifyRelation', 'node:n1', {
        links: [{ $ref: 'objective:o1', linkType: 'direct', tags: [] }]
      }),
      relationMutation('node', 'unrelate', 'node:n1', {
        links: [{ $ref: 'objective:o1', linkType: 'direct' }]
      }),
      relationMutation('node', 'modifyRelation', 'node:n1', {
        links: [{ $ref: 'node:n3', linkType: 'direct', tags: ['linkTag:point'] }]
      }),
      relationMutation('node', 'modifyRelation', 'node:n1', {
        links: [{ $ref: 'node:n3', toResource: 'objective', linkType: 'direct' }]
      })
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
    }
    expect(await linkTargets('node:n1')).toEqual(['node:n3', 'objective:o1']);
    expect(await linkTags('node:n1', 'objective:o1')).toEqual(['linkTag:cross']);
  });

  it('cannot send a relation operation that names no relation', async () => {
    for (const change of [
      relationMutation('node', 'relate', 'node:n3', {}),
      { ...mutation('node', 'relate', 'node:n3'), relation: 'parent' },
      relationMutation('node', 'relate', 'node:n3', { links: ['node:n1'] }, { relation: 'parent' })
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
    }
  });
});

describe('pointron token', () => {
  it('reads Pointron resources and not Memotron ones', async () => {
    expect(await ids(await call('/datafn/query', actors.pointron, { resource: 'objective', version: 1 })))
      .toEqual(['objective:o1', 'objective:o2']);
    expect((await call('/datafn/query', actors.pointron, { resource: 'node', version: 1 })).status).toBe(403);
    expect(await ids(await call('/datafn/query', actors.pointron, {
      resource: 'collection',
      version: 1,
      filters: { resource: 'objective' }
    }))).toEqual(['collection:goals']);
  });

  it('sees views and link tags filtered to Pointron', async () => {
    expect(await ids(await call('/datafn/query', actors.pointron, { resource: 'view', version: 1 })))
      .toEqual(['view:both', 'view:goals']);
    expect(await ids(await call('/datafn/query', actors.pointron, { resource: 'linkTag', version: 1 })))
      .toEqual(['linkTag:point', 'linkTag:shared']);
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

describe('relations written through record fields and relation metadata', () => {
  beforeAll(async () => {
    const seeded = await call('/datafn/mutation', actors.cookie, [
      mutation('collection', 'insert', 'collection:memo-ext', { label: 'Extends', type: 'list', resource: 'node' }),
      mutation('property', 'insert', 'property:memo-prop', { label: 'Mood', type: 'text', resource: 'node' })
    ]);
    expect(seeded.status).toBe(200);
  });

  it('memotron token cannot point a foreign-key field at a Pointron record', async () => {
    for (const change of [
      mutation('collection', 'merge', 'collection:memo-ext', { typeToExtend: 'collection:goals' }),
      mutation('collection', 'insert', 'collection:memo-sneaky', {
        label: 'Sneaky', type: 'list', resource: 'node', typeToExtend: 'collection:goals'
      }),
      mutation('node', 'merge', 'node:n3', { parent: 'objective:o1' })
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
    }
    const transact = await call('/datafn/transact', actors.memotronWrite, {
      steps: [{ mutation: mutation('collection', 'merge', 'collection:memo-ext', { typeToExtend: 'collection:goals' }) }]
    });
    expect(transact.status).toBe(403);
    expect(await storedField('collection', 'collection:memo-ext', 'typeToExtend')).toBeFalsy();
    expect(await storedField('node', 'node:n3', 'parent')).not.toBe('objective:o1');
    expect(await ids(await call('/datafn/query', actors.cookie, {
      resource: 'collection', version: 1, filters: { id: { eq: 'collection:memo-sneaky' } }
    }))).toEqual([]);
  });

  it('memotron token points a foreign-key field at a Memotron record and clears it', async () => {
    const pointed = await call('/datafn/push', actors.memotronWrite, push(
      mutation('collection', 'merge', 'collection:memo-ext', { typeToExtend: 'collection:notes' })
    ));
    expect(pointed.status).toBe(200);
    expect(await storedField('collection', 'collection:memo-ext', 'typeToExtend')).toBe('collection:notes');
    const cleared = await call('/datafn/push', actors.memotronWrite, push(
      mutation('collection', 'merge', 'collection:memo-ext', { typeToExtend: null })
    ));
    expect(cleared.status).toBe(200);
    expect(await storedField('collection', 'collection:memo-ext', 'typeToExtend')).toBeNull();
  });

  it('memotron token cannot name a Pointron collection in property value metadata', async () => {
    const valuesFor = async () => (await joinRows('property_values'))
      .filter((row) => row.itemId === 'node:n3')
      .map((row) => row.collectionId);
    const cross = await call('/datafn/push', actors.memotronWrite, push(relationMutation('node', 'relate', 'node:n3', {
      propertyValues: [{ $ref: 'property:memo-prop', collectionId: 'collection:goals', value: 'calm' }]
    })));
    expect(cross.status).toBe(403);
    expect(await valuesFor()).toEqual([]);
    const own = await call('/datafn/push', actors.memotronWrite, push(relationMutation('node', 'relate', 'node:n3', {
      propertyValues: [{ $ref: 'property:memo-prop', collectionId: 'collection:notes', value: 'calm' }]
    })));
    expect(own.status).toBe(200);
    expect(await valuesFor()).toEqual(['collection:notes']);
  });

  it('pointron token cannot point a foreign-key field at a Memotron record', async () => {
    const response = await call('/datafn/push', actors.pointron, push(
      mutation('collection', 'merge', 'collection:goals', { typeToExtend: 'collection:notes' })
    ));
    expect(response.status).toBe(403);
    expect(await storedField('collection', 'collection:goals', 'typeToExtend')).toBeFalsy();
  });
});

describe('space items pointing at shared resources', () => {
  const collectionItem = (name: string) => ({
    id: `item-collection-${name}`,
    type: 'resource',
    resourceType: 'collection',
    resourceId: `collection:${name}`,
    label: name
  });
  const mismatchedItem = { ...nodeItem, id: 'item-mismatched', resourceId: 'objective:o1' };
  const spaceItem = { id: 'item-space', type: 'resource', resourceType: 'space', resourceId: 'space:notes', label: 'Notes' };
  const allItems = [collectionItem('goals'), collectionItem('notes'), nodeItem, mismatchedItem, spaceItem];
  const spaceQuery = { resource: 'space', version: 1, filters: { id: { eq: 'space:collections' } } };

  async function storedItems(): Promise<unknown> {
    return (await rows(await call('/datafn/query', actors.cookie, spaceQuery)))[0]?.items;
  }

  beforeAll(async () => {
    const seeded = await call('/datafn/mutation', actors.cookie, [
      mutation('space', 'insert', 'space:collections', { label: 'Collections', view: 'sidenav', items: allItems })
    ]);
    expect(seeded.status).toBe(200);
  });

  it('memotron token sees only items whose stored record is Memotron, in queries and transact', async () => {
    const expected = [collectionItem('notes'), nodeItem];
    expect((await rows(await call('/datafn/query', actors.memotronRead, spaceQuery)))[0]?.items)
      .toEqual(expected);
    const transact = await call('/datafn/transact', actors.memotronRead, { steps: [{ query: spaceQuery }] });
    expect(transact.status).toBe(200);
    const body = await transact.json() as { result: { results: { data: { items: unknown }[] }[] } };
    expect(body.result.results[0]?.data[0]?.items).toEqual(expected);
  });

  it('pointron token sees only the Pointron collection item', async () => {
    expect((await rows(await call('/datafn/query', actors.pointron, spaceQuery)))[0]?.items)
      .toEqual([collectionItem('goals')]);
  });

  it('cookie and nucleum sessions still see every item', async () => {
    for (const actor of ['cookie', 'nucleum'] as const) {
      expect((await rows(await call('/datafn/query', actors[actor], spaceQuery)))[0]?.items).toEqual(allItems);
    }
  });

  it('memotron write token cannot drop or delete hidden items', async () => {
    for (const change of [
      mutation('space', 'merge', 'space:collections', { items: [] }),
      mutation('space', 'replace', 'space:collections', { label: 'Collections', view: 'sidenav', items: [nodeItem] }),
      mutation('space', 'delete', 'space:collections')
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
    }
    expect(await storedItems()).toEqual(allItems);
  });

  it('memotron write token cannot add an item pointing at a Pointron collection', async () => {
    for (const items of [[collectionItem('goals')], [mismatchedItem], [spaceItem]]) {
      const response = await call('/datafn/push', actors.memotronWrite, push(
        mutation('space', 'insert', `space:sneaky-${sequence}`, { label: 'Sneaky', view: 'sidenav', items })
      ));
      expect(response.status).toBe(403);
    }
  });

  it('memotron write token adds items for Memotron collections, including one created in the same push', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('collection', 'insert', 'collection:memo-fresh', { label: 'Fresh', type: 'list', resource: 'node' }),
      mutation('space', 'insert', 'space:memo-collections', {
        label: 'Memo', view: 'sidenav', items: [collectionItem('notes'), collectionItem('memo-fresh')]
      })
    ));
    expect(response.status).toBe(200);
    expect((await rows(await call('/datafn/query', actors.memotronRead, {
      resource: 'space', version: 1, filters: { id: { eq: 'space:memo-collections' } }
    })))[0]?.items).toEqual([collectionItem('notes'), collectionItem('memo-fresh')]);
  });
});

describe('record and relation identity overrides', () => {
  const takeover = { id: 'collection:goals', label: 'TAKEN', type: 'list', resource: 'node' };

  async function storedSpaceItems(id: string): Promise<unknown> {
    return storedField('space', id, 'items');
  }

  it('memotron token cannot write another record by naming it in record.id', async () => {
    const goalsBefore = await rows(await call('/datafn/query', actors.cookie, {
      resource: 'collection', version: 1, filters: { id: { eq: 'collection:goals' } }
    }));
    for (const change of [
      mutation('collection', 'replace', 'collection:unused', takeover),
      mutation('collection', 'merge', 'collection:notes', { id: 'collection:goals', label: 'TAKEN' }),
      mutation('collection', 'insert', 'collection:unused', takeover)
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
      expect((await call('/datafn/mutation', actors.memotronWrite, change)).status).toBe(403);
      const transact = await call('/datafn/transact', actors.memotronWrite, { steps: [{ mutation: change }] });
      expect(transact.status).toBe(403);
    }
    expect(await rows(await call('/datafn/query', actors.cookie, {
      resource: 'collection', version: 1, filters: { id: { eq: 'collection:goals' } }
    }))).toEqual(goalsBefore);
    expect(await storedLabel('collection', 'collection:unused')).toBeUndefined();
  });

  it('memotron token cannot replace a space holding hidden items through record.id', async () => {
    const itemsBefore = await storedSpaceItems('space:mixed');
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('space', 'replace', 'space:fresh', { id: 'space:mixed', label: 'Fresh', view: 'sidenav', items: [] })
    ));
    expect(response.status).toBe(403);
    expect(await storedSpaceItems('space:mixed')).toEqual(itemsBefore);
    expect(await storedLabel('space', 'space:fresh')).toBeUndefined();
  });

  it('memotron token writes a record whose record.id repeats the mutation id', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('node', 'insert', 'node:same-id', { id: 'node:same-id', label: 'Same id', contentType: 'text' }),
      mutation('collection', 'merge', 'collection:notes', { id: 'collection:notes', label: 'Notes again' })
    ));
    expect(response.status).toBe(200);
    expect(await storedLabel('node', 'node:same-id')).toBe('Same id');
    expect(await storedLabel('collection', 'collection:notes')).toBe('Notes again');
  });

  it('pointron token cannot write a Memotron collection through record.id', async () => {
    const response = await call('/datafn/push', actors.pointron, push(
      mutation('collection', 'replace', 'collection:point-unused', {
        id: 'collection:notes', label: 'TAKEN', type: 'list', resource: 'objective'
      })
    ));
    expect(response.status).toBe(403);
    expect(await storedLabel('collection', 'collection:notes')).toBe('Notes again');
  });

  it('memotron token cannot write or relate another app record by naming it as the mutation id', async () => {
    const linksBefore = await joinRows('record_links');
    const collectionItemsBefore = await joinRows('collection_items');
    const objectivesBefore = [await storedLabel('objective', 'objective:o1'), await storedLabel('objective', 'objective:o2')];
    expect(objectivesBefore.every((label) => typeof label === 'string')).toBe(true);
    for (const change of [
      relationMutation('node', 'relate', 'objective:o1', { links: [{ $ref: 'node:n3', linkType: 'direct', tags: [] }] }),
      relationMutation('node', 'relate', 'objective:o1', { collections: 'collection:notes' }),
      relationMutation('node', 'unrelate', 'objective:o1', { links: 'objective:o2' }),
      mutation('node', 'merge', 'objective:o1', { label: 'Hijacked' }),
      mutation('node', 'delete', 'objective:o2')
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
      expect((await call('/datafn/mutation', actors.memotronWrite, change)).status).toBe(403);
      expect((await call('/datafn/transact', actors.memotronWrite, { steps: [{ mutation: change }] })).status)
        .toBe(403);
    }
    const pointronChange = relationMutation('objective', 'relate', 'node:n1', { collections: 'collection:goals' });
    expect((await call('/datafn/push', actors.pointron, push(pointronChange))).status).toBe(403);
    expect(await joinRows('record_links')).toEqual(linksBefore);
    expect(await joinRows('collection_items')).toEqual(collectionItemsBefore);
    expect([await storedLabel('objective', 'objective:o1'), await storedLabel('objective', 'objective:o2')])
      .toEqual(objectivesBefore);
  });

  it('memotron token cannot override a join row id or its endpoint columns in relation metadata', async () => {
    const linksBefore = await joinRows('record_links');
    for (const metadata of [
      { id: 'objective:o1:objective:o2' },
      { in: 'objective:o1' },
      { out: 'objective:o2' }
    ]) {
      const change = relationMutation('node', 'relate', 'node:n1', {
        links: [{ $ref: 'node:n3', linkType: 'direct', tags: [], ...metadata }]
      });
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
      expect((await call('/datafn/transact', actors.memotronWrite, { steps: [{ mutation: change }] })).status)
        .toBe(403);
    }
    const viewOverride = relationMutation('collection', 'relate', 'collection:notes', {
      views: [{ $ref: 'view:notes', collectionId: 'collection:goals' }]
    });
    expect((await call('/datafn/push', actors.memotronWrite, push(viewOverride))).status).toBe(403);
    expect(await joinRows('record_links')).toEqual(linksBefore);
    expect((await joinRows('collection_views')).filter((row) => row.collectionId === 'collection:goals')
      .map((row) => row.viewId).sort()).toEqual(['view:both', 'view:goals']);
  });
});

describe('access logs of shared resources', () => {
  const at = Date.now();
  const logs = {
    'accessLog:goals': { resource: 'collection', resourceId: 'collection:goals', action: 'OPEN', timestamp: at },
    'accessLog:notes': { resource: 'collection', resourceId: 'collection:notes', action: 'OPEN', timestamp: at },
    'accessLog:node': { resource: 'node', resourceId: 'node:n1', action: 'OPEN', timestamp: at },
    'accessLog:objective': { resource: 'objective', resourceId: 'objective:o1', action: 'OPEN', timestamp: at }
  };
  const logItem = (id: string) => ({ id: `item-${id}`, type: 'resource', resourceType: 'accessLog', resourceId: id, label: id });

  async function logIds(headers: Headers, filters: unknown): Promise<string[]> {
    return ids(await call('/datafn/query', headers, { resource: 'accessLog', version: 1, filters }));
  }

  beforeAll(async () => {
    const seeded = await call('/datafn/mutation', actors.cookie, [
      ...Object.entries(logs).map(([id, record]) => mutation('accessLog', 'insert', id, record)),
      mutation('space', 'insert', 'space:logs', {
        label: 'Logs', view: 'sidenav', items: Object.keys(logs).map(logItem)
      })
    ]);
    expect(seeded.status).toBe(200);
  });

  it('cookie sessions still read logs of shared resources', async () => {
    expect(await logIds(actors.cookie, { resource: 'collection' })).toEqual(['accessLog:goals', 'accessLog:notes']);
  });

  it('scoped tokens cannot read logs that name a shared resource, in queries, batches or transact', async () => {
    for (const headers of [actors.memotronRead, actors.pointron]) {
      for (const filters of [{ resource: 'collection' }, { resource: { in: ['node', 'collection'] } }]) {
        const query = { resource: 'accessLog', version: 1, filters };
        expect((await call('/datafn/query', headers, query)).status).toBe(403);
        expect((await call('/datafn/query', headers, [query])).status).toBe(403);
        expect((await call('/datafn/transact', headers, { steps: [{ query }] })).status).toBe(403);
      }
    }
    expect(await logIds(actors.memotronRead, { resource: { in: ['node'] } })).toEqual(['accessLog:node']);
    expect(await logIds(actors.pointron, { resource: 'objective' })).toEqual(['accessLog:objective']);
  });

  it('scoped tokens cannot change or delete logs that name a shared resource', async () => {
    for (const change of [
      mutation('accessLog', 'delete', 'accessLog:goals'),
      mutation('accessLog', 'merge', 'accessLog:goals', { resource: 'node' }),
      mutation('accessLog', 'merge', 'accessLog:notes', { action: 'CLOSE' }),
      mutation('accessLog', 'insert', 'accessLog:new-collection', {
        resource: 'collection', resourceId: 'collection:notes', action: 'OPEN', timestamp: at
      })
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
      expect((await call('/datafn/mutation', actors.memotronWrite, change)).status).toBe(403);
      expect((await call('/datafn/transact', actors.memotronWrite, { steps: [{ mutation: change }] })).status)
        .toBe(403);
    }
    const pointronDelete = mutation('accessLog', 'delete', 'accessLog:notes');
    expect((await call('/datafn/push', actors.pointron, push(pointronDelete))).status).toBe(403);
    expect(await logIds(actors.cookie, { resource: 'collection' })).toEqual(['accessLog:goals', 'accessLog:notes']);
    expect(await storedField('accessLog', 'accessLog:notes', 'action')).toBe('OPEN');
    expect(await storedLabel('accessLog', 'accessLog:new-collection')).toBeUndefined();
  });

  it('scoped tokens cannot write a log of their own type that names another record', async () => {
    for (const change of [
      mutation('accessLog', 'insert', 'accessLog:forged-goal', {
        resource: 'node', resourceId: 'objective:o1', action: 'OPEN', timestamp: at
      }),
      mutation('accessLog', 'insert', 'accessLog:forged-collection', {
        resource: 'node', resourceId: 'collection:goals', action: 'OPEN', timestamp: at
      }),
      mutation('accessLog', 'replace', 'accessLog:node', {
        resource: 'node', resourceId: 'collection:goals', action: 'OPEN', timestamp: at
      }),
      mutation('accessLog', 'merge', 'accessLog:node', { resourceId: 'objective:o1' })
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
      expect((await call('/datafn/mutation', actors.memotronWrite, change)).status).toBe(403);
      expect((await call('/datafn/transact', actors.memotronWrite, { steps: [{ mutation: change }] })).status)
        .toBe(403);
    }
    const pointronForged = mutation('accessLog', 'insert', 'accessLog:forged-node', {
      resource: 'objective', resourceId: 'node:n1', action: 'OPEN', timestamp: at
    });
    expect((await call('/datafn/push', actors.pointron, push(pointronForged))).status).toBe(403);
    expect(await storedField('accessLog', 'accessLog:node', 'resourceId')).toBe('node:n1');
    for (const id of ['accessLog:forged-goal', 'accessLog:forged-collection', 'accessLog:forged-node']) {
      expect(await storedField('accessLog', id, 'resource')).toBeUndefined();
    }
  });

  it('scoped tokens write logs of their own resources', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('accessLog', 'merge', 'accessLog:node', { action: 'EDIT' }),
      mutation('accessLog', 'insert', 'accessLog:node-2', {
        resource: 'node', resourceId: 'node:n3', action: 'OPEN', timestamp: at
      })
    ));
    expect(response.status).toBe(200);
    expect(await logIds(actors.memotronRead, { resource: 'node' })).toEqual(['accessLog:node', 'accessLog:node-2']);
    expect(await storedField('accessLog', 'accessLog:node', 'action')).toBe('EDIT');
  });

  it('space items pointing at logs of shared resources stay hidden', async () => {
    const query = { resource: 'space', version: 1, filters: { id: { eq: 'space:logs' } } };
    const visible = async (headers: Headers) =>
      ((await rows(await call('/datafn/query', headers, query)))[0]?.items as { resourceId: string }[])
        .map((item) => item.resourceId);
    expect(await visible(actors.memotronRead)).toEqual(['accessLog:node']);
    expect(await visible(actors.pointron)).toEqual(['accessLog:objective']);
    const dropped = await call('/datafn/push', actors.memotronWrite, push(
      mutation('space', 'merge', 'space:logs', { items: [logItem('accessLog:node')] })
    ));
    expect(dropped.status).toBe(403);
  });
});

describe('replacing shared records', () => {
  it('memotron token cannot replace a collection without an in-grant resource field', async () => {
    const before = await rows(await call('/datafn/query', actors.cookie, {
      resource: 'collection', version: 1, filters: { id: { eq: 'collection:notes' } }
    }));
    for (const change of [
      mutation('collection', 'replace', 'collection:notes', { label: 'Orphaned', type: 'list' }),
      mutation('collection', 'replace', 'collection:notes', { label: 'Moved', type: 'list', resource: 'objective' }),
      mutation('collection', 'replace', 'collection:notes'),
      mutation('accessLog', 'replace', 'accessLog:node', { resourceId: 'node:n1', action: 'OPEN', timestamp: Date.now() })
    ]) {
      expect((await call('/datafn/push', actors.memotronWrite, push(change))).status).toBe(403);
      expect((await call('/datafn/mutation', actors.memotronWrite, change)).status).toBe(403);
      expect((await call('/datafn/transact', actors.memotronWrite, { steps: [{ mutation: change }] })).status)
        .toBe(403);
    }
    expect(await rows(await call('/datafn/query', actors.cookie, {
      resource: 'collection', version: 1, filters: { id: { eq: 'collection:notes' } }
    }))).toEqual(before);
    expect(await storedField('accessLog', 'accessLog:node', 'resource')).toBe('node');
  });

  it('pointron token cannot replace a collection without its resource field', async () => {
    const change = mutation('collection', 'replace', 'collection:goals', { label: 'Orphaned', type: 'list' });
    expect((await call('/datafn/push', actors.pointron, push(change))).status).toBe(403);
    expect(await storedField('collection', 'collection:goals', 'resource')).toBe('objective');
  });

  it('memotron token replaces a collection that keeps a Memotron resource', async () => {
    const response = await call('/datafn/push', actors.memotronWrite, push(
      mutation('collection', 'replace', 'collection:notes', { label: 'Notes replaced', type: 'list', resource: 'node' })
    ));
    expect(response.status).toBe(200);
    expect(await storedLabel('collection', 'collection:notes')).toBe('Notes replaced');
    expect(await storedField('collection', 'collection:notes', 'resource')).toBe('node');
  });
});

describe('projections of filtered views and link tags', () => {
  it('denies a projection that drops the id the filter needs, in queries, batches and transact', async () => {
    for (const query of [
      { resource: 'view', version: 1, select: ['label'] },
      { resource: 'linkTag', version: 1, select: ['label'] },
      { resource: 'view', version: 1, select: 'label' }
    ]) {
      expect((await call('/datafn/query', actors.memotronRead, query)).status).toBe(403);
      expect((await call('/datafn/query', actors.memotronRead, [{ resource: 'node', version: 1 }, query])).status)
        .toBe(403);
      expect((await call('/datafn/transact', actors.memotronRead, { steps: [{ query }] })).status).toBe(403);
    }
    expect((await call('/datafn/query', actors.pointron, { resource: 'view', version: 1, select: ['label'] })).status)
      .toBe(403);
  });

  it('returns the filtered rows for a projection that keeps the id', async () => {
    const unprojected = await ids(await call('/datafn/query', actors.memotronRead, { resource: 'view', version: 1 }));
    expect(unprojected).toContain('view:notes');
    expect(unprojected).not.toContain('view:goals');
    for (const select of [['id', 'label'], ['*'], []]) {
      const data = await rows(await call('/datafn/query', actors.memotronRead, { resource: 'view', version: 1, select }));
      expect(data.map((row) => String(row.id)).sort()).toEqual(unprojected);
      expect(data.every((row) => typeof row.label === 'string')).toBe(true);
    }
    expect(await ids(await call('/datafn/query', actors.memotronRead, { resource: 'linkTag', version: 1, select: [] })))
      .toEqual(await ids(await call('/datafn/query', actors.memotronRead, { resource: 'linkTag', version: 1 })));
    const transact = await call('/datafn/transact', actors.memotronRead, {
      steps: [{ query: { resource: 'linkTag', version: 1, select: ['id', 'label'] } }]
    });
    expect(transact.status).toBe(200);
    const text = JSON.stringify(await transact.json());
    expect(text).toContain('linkTag:memo');
    expect(text).not.toContain('linkTag:point');
  });
});
