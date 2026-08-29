import assert from 'node:assert/strict';
import type { AccountTestHarness } from './harness.js';
import {
  resolveAccountUserNamespace,
  resolveAccountUserPrincipal
} from '../datafn/server.js';

export async function runDatafnSmokeTests(
  harness: AccountTestHarness,
  baseUrl: string
): Promise<void> {
  const allowedOrigin = baseUrl;
  const password = 'CorrectHorseBatteryStaple1!';
  const email = `datafn-${Date.now()}@example.com`;
  const signup = await jsonFetch(harness, `${baseUrl}/auth/sign-up/password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      sessionMode: 'bearer'
    })
  });
  assert.equal(signup.response.status, 200);
  const token = readString(signup.body.data?.token, 'signup token');
  const actorId = readString(signup.body.data?.session?.actorId, 'signup actorId');
  const shareeSignup = await jsonFetch(harness, `${baseUrl}/auth/sign-up/password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: `datafn-sharee-${Date.now()}@example.com`,
      password,
      sessionMode: 'bearer'
    })
  });
  assert.equal(shareeSignup.response.status, 200);
  const shareeToken = readString(shareeSignup.body.data?.token, 'sharee token');
  const shareeActorId = readString(shareeSignup.body.data?.session?.actorId, 'sharee actorId');
  const unrelatedSignup = await jsonFetch(harness, `${baseUrl}/auth/sign-up/password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: `datafn-unrelated-${Date.now()}@example.com`,
      password,
      sessionMode: 'bearer'
    })
  });
  assert.equal(unrelatedSignup.response.status, 200);
  const unrelatedToken = readString(unrelatedSignup.body.data?.token, 'unrelated token');
  const authHeaders = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json'
  };
  const shareeHeaders = {
    authorization: `Bearer ${shareeToken}`,
    'content-type': 'application/json'
  };
  const unrelatedHeaders = {
    authorization: `Bearer ${unrelatedToken}`,
    'content-type': 'application/json'
  };
  const namespace = resolveAccountUserNamespace(actorId);

  const status = await jsonFetch(harness, `${baseUrl}/datafn/status`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  assert.equal(status.response.status, 200);
  assert.equal(status.body.ok, true);
  assert.ok(status.body.result?.schemaHash);
  assert.equal(status.response.headers.get('x-datafn-region'), process.env.ACCOUNT_REGION_ID ?? 'local');

  const unauthenticated = await jsonFetch(harness, `${baseUrl}/datafn/query`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1
    })
  });
  assert.notEqual(unauthenticated.response.status, 404);
  assert.equal(unauthenticated.body.ok, false);

  const tagId = `linkTag:datafn-${Date.now()}`;
  const mutation = await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      namespace: 'user:escape-attempt',
      resource: 'linkTag',
      version: 1,
      operation: 'insert',
      id: tagId,
      clientId: 'account-smoke',
      mutationId: `${tagId}-insert`,
      record: {
        label: 'DataFn account smoke',
        color: 3
      }
    })
  });
  assert.equal(mutation.response.status, 200);
  assert.equal(mutation.body.ok, true);
  assert.equal(mutation.body.result.ok, true);

  const stored = await harness.datafnDatabase.findOne({
    model: 'linkTag',
    where: [{ field: 'id', operator: 'eq', value: tagId }],
    namespace
  });
  assert.equal((stored as { createdBy?: unknown } | null)?.createdBy, actorId);
  assert.equal((stored as { __ns?: unknown } | null)?.__ns, namespace);
  const escapedRows = await harness.datafnDatabase.findMany({
    model: 'linkTag',
    where: [
      { field: 'id', operator: 'eq', value: tagId },
      { field: '__ns', operator: 'eq', value: 'user:escape-attempt' }
    ],
    namespace
  });
  assert.equal(escapedRows.length, 0);
  const accountDbRecord = await harness.database.findOne({
    model: 'linkTag',
    where: [{ field: 'id', operator: 'eq', value: tagId }],
    namespace
  });
  assert.equal(accountDbRecord, null);

  const query = await jsonFetch(harness, `${baseUrl}/datafn/query`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1,
      filters: {
        id: tagId
      },
      select: ['id', 'label', 'createdBy']
    })
  });
  assert.equal(query.response.status, 200);
  assert.equal(query.body.ok, true);
  assert.equal(query.body.result.data[0].id, tagId);

  const objectiveId = `objective:search-${Date.now()}`;
  const goalMutation = await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      resource: 'objective',
      version: 1,
      operation: 'insert',
      id: objectiveId,
      clientId: 'account-smoke',
      mutationId: `${objectiveId}-insert`,
      record: {
        label: 'Gamma server search',
        type: 'INDEFINITE',
        status: 'NOT_STARTED'
      }
    })
  });
  assert.equal(goalMutation.response.status, 200);
  assert.equal(goalMutation.body.ok, true);
  const goalSearch = await serverSearch(harness, baseUrl, authHeaders, 'gamma', ['objective']);
  assert.equal(goalSearch.body.ok, true);
  assert.ok(
    goalSearch.body.result.results.some((item: { id?: string }) => item.id === objectiveId),
    JSON.stringify(goalSearch.body)
  );

  const notShared = await sharedWithMeQuery(harness, baseUrl, shareeHeaders, tagId);
  assert.equal(notShared.body.ok, true);
  assert.equal(notShared.body.result.data.length, 0);

  await assertShare(
    harness,
    baseUrl,
    authHeaders,
    namespace,
    tagId,
    resolveAccountUserPrincipal(shareeActorId),
    `${tagId}-share-user`
  );
  const debugShareRows = await harness.datafnDatabase.findMany({
    model: '__datafn_permissions_global',
    where: [
      { field: 'resourceType', operator: 'eq', value: 'linkTag' },
      { field: 'principalId', operator: 'eq', value: resolveAccountUserPrincipal(shareeActorId) },
      { field: '__ns', operator: 'eq', value: resolveAccountUserNamespace(shareeActorId) }
    ],
    namespace: resolveAccountUserNamespace(shareeActorId)
  });
  assert.equal(debugShareRows.length, 0, JSON.stringify({ shareeActorId, debugShareRows }));

  const sharedToUser = await sharedWithMeQuery(harness, baseUrl, shareeHeaders, tagId);
  assert.equal(sharedToUser.response.status, 200);
  assert.equal(sharedToUser.body.ok, true);
  assert.equal(sharedToUser.body.result.data[0].id, tagId);

  const scopedTagId = `linkTag:scope-${Date.now()}`;
  const scopedMutation = await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1,
      operation: 'insert',
      id: scopedTagId,
      clientId: 'account-smoke',
      mutationId: `${scopedTagId}-insert`,
      record: {
        label: 'Scoped DataFn smoke',
        color: 4
      }
    })
  });
  assert.equal(scopedMutation.body.ok, true);
  await assertShare(
    harness,
    baseUrl,
    authHeaders,
    namespace,
    undefined,
    resolveAccountUserPrincipal(shareeActorId),
    `${scopedTagId}-share-scope`,
    'viewer',
    'resource'
  );
  const scopedShared = await sharedWithMeQuery(harness, baseUrl, shareeHeaders, scopedTagId);
  assert.equal(scopedShared.body.ok, true);
  assert.equal(scopedShared.body.result.data[0].id, scopedTagId);

  const sharedCollectionId = `collection:search-alpha-${Date.now()}`;
  const sharedCollectionMutation = await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      resource: 'collection',
      version: 1,
      operation: 'insert',
      id: sharedCollectionId,
      clientId: 'account-smoke',
      mutationId: `${sharedCollectionId}-insert`,
      record: {
        label: 'Shared alpha collection',
        type: 'TYPED',
        resource: 'node'
      }
    })
  });
  assert.equal(sharedCollectionMutation.body.ok, true);
  await assertShare(
    harness,
    baseUrl,
    authHeaders,
    namespace,
    sharedCollectionId,
    resolveAccountUserPrincipal(shareeActorId),
    `${sharedCollectionId}-share-user`,
    'viewer',
    'record',
    'collection'
  );
  const sharedSearch = await serverSearch(harness, baseUrl, shareeHeaders, 'alpha', ['collection']);
  assert.equal(sharedSearch.body.ok, true);
  assert.ok(
    sharedSearch.body.result.results.some((item: { id?: string }) => item.id === sharedCollectionId),
    JSON.stringify(sharedSearch.body)
  );
  const unrelatedSearch = await serverSearch(harness, baseUrl, unrelatedHeaders, 'alpha', ['collection']);
  assert.equal(unrelatedSearch.body.ok, true);
  assert.ok(
    !unrelatedSearch.body.result.results.some((item: { id?: string }) => item.id === sharedCollectionId),
    JSON.stringify(unrelatedSearch.body)
  );
  await assertUnshare(
    harness,
    baseUrl,
    authHeaders,
    sharedCollectionId,
    resolveAccountUserPrincipal(shareeActorId),
    `${sharedCollectionId}-unshare-user`,
    'collection'
  );
  const revokedSearch = await serverSearch(harness, baseUrl, shareeHeaders, 'alpha', ['collection']);
  assert.equal(revokedSearch.body.ok, true);
  assert.ok(
    !revokedSearch.body.result.results.some((item: { id?: string }) => item.id === sharedCollectionId),
    JSON.stringify(revokedSearch.body)
  );

  const publicLink = await jsonFetch(harness, `${baseUrl}/datafn/public-links`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      resource: 'linkTag',
      recordId: tagId,
      scope: 'record',
      level: 'viewer'
    })
  });
  assert.equal(publicLink.response.status, 200);
  assert.equal(publicLink.body.ok, true);
  const publicLinkId = readString(publicLink.body.result?.id, 'public link id');
  const publicLinkToken = readString(publicLink.body.result?.token, 'public link token');
  const publicLinkPrincipal = readString(publicLink.body.result?.principalId, 'public link principal');
  assert.match(publicLinkPrincipal, /^public_link:plink:/);
  assert.ok(!JSON.stringify(publicLink.body.result).includes('tokenHash'));

  const publicLinkRecord = await harness.datafnDatabase.findOne({
    model: 'publicLink',
    where: [{ field: 'id', operator: 'eq', value: publicLinkId }],
    namespace
  });
  assert.equal((publicLinkRecord as { tokenHash?: unknown } | null)?.tokenHash === publicLinkToken, false);
  assert.ok(typeof (publicLinkRecord as { tokenHash?: unknown } | null)?.tokenHash === 'string');

  const publicLinkRead = await jsonFetch(harness, `${baseUrl}/datafn/query`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-datafn-public-link-token': publicLinkToken
    },
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1,
      filters: {
        id: tagId
      },
      select: ['id', 'label']
    })
  });
  assert.equal(publicLinkRead.response.status, 200);
  assert.equal(publicLinkRead.body.ok, true);
  assert.equal(publicLinkRead.body.result.data[0].id, tagId);

  const publicLinkWrite = await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-datafn-public-link-token': publicLinkToken
    },
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1,
      operation: 'replace',
      id: tagId,
      clientId: 'account-smoke-public-link',
      mutationId: `${tagId}-public-mutate`,
      record: {
        label: 'Public link edit attempt'
      }
    })
  });
  assert.equal(publicLinkWrite.body.ok, false);

  const revoked = await jsonFetch(harness, `${baseUrl}/datafn/public-links/revoke`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ id: publicLinkId })
  });
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.body.ok, true);
  const revokedRead = await jsonFetch(harness, `${baseUrl}/datafn/query`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-datafn-public-link-token': publicLinkToken
    },
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1,
      filters: {
        id: tagId
      }
    })
  });
  assert.equal(revokedRead.body.ok, false);

  for (const route of [
    ['transact', { atomic: false, steps: [] }],
    ['clone', { clientId: 'account-smoke-clone' }],
    ['pull', { clientId: 'account-smoke-pull', cursor: '0', limit: 10 }],
    ['push', { clientId: 'account-smoke-push', mutations: [] }],
    ['reconcile', { clientId: 'account-smoke-reconcile', resources: ['linkTag'] }],
    ['search', { query: 'DataFn', resources: ['linkTag'], limit: 5 }]
  ] as const) {
    const routeResult = await jsonFetch(harness, `${baseUrl}/datafn/${route[0]}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(route[1])
    });
    assert.notEqual(routeResult.response.status, 404, `/datafn/${route[0]} must be mounted`);
  }

  const preflight = await harness.app.fetch(new Request(`${baseUrl}/datafn/query`, {
    method: 'OPTIONS',
    headers: {
      origin: allowedOrigin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization,x-authfn-csrf,x-datafn-client-id'
    }
  }));
  assert.equal(preflight.headers.get('access-control-allow-origin'), allowedOrigin);
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  assert.match(preflight.headers.get('access-control-allow-headers') ?? '', /x-datafn-client-id/i);

  const blockedPreflight = await harness.app.fetch(new Request(`${baseUrl}/datafn/query`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://evil.example',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization'
    }
  }));
  assert.equal(blockedPreflight.headers.get('access-control-allow-origin'), null);
  assert.notEqual(blockedPreflight.headers.get('access-control-allow-credentials'), 'true');

  const secretText = `secret-record-body-${Date.now()}`;
  await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1,
      operation: 'insert',
      id: `linkTag:log-${Date.now()}`,
      clientId: 'account-smoke',
      mutationId: `${tagId}-bad`,
      record: {
        label: secretText,
        color: 'bad'
      }
    })
  });
  const datafnLogs = harness.logEvents().filter((event) =>
    JSON.stringify(event).includes('/datafn/')
  );
  assert.ok(datafnLogs.length > 0);
  assert.ok(datafnLogs.some((event) =>
    JSON.stringify(event).includes('durationMs') &&
    JSON.stringify(event).includes('regionId')
  ));
  assert.ok(!datafnLogs.some((event) => JSON.stringify(event).includes(secretText)));
}

async function assertShare(
  harness: AccountTestHarness,
  baseUrl: string,
  headers: Record<string, string>,
  namespace: string,
  recordId: string | undefined,
  principalId: string,
  mutationId: string,
  level = 'viewer',
  scope: 'record' | 'resource' = 'record',
  resource = 'linkTag'
): Promise<void> {
  const shared = await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      resource,
      version: 1,
      operation: 'share',
      ...(recordId ? { id: recordId } : {}),
      scope,
      clientId: 'account-smoke',
      mutationId,
      shareWith: {
        principalId,
        level
      }
    })
  });
  assert.equal(shared.response.status, 200);
  assert.equal(shared.body.ok, true);
  assert.equal(shared.body.result.ok, true);

  const row = await harness.datafnDatabase.findOne({
    model: '__datafn_permissions_global',
    where: [
      { field: 'resourceType', operator: 'eq', value: resource },
      { field: 'resourceId', operator: 'eq', value: recordId ?? null },
      { field: 'principalId', operator: 'eq', value: principalId }
    ],
    namespace
  });
  assert.equal((row as { level?: unknown } | null)?.level, level);
}

async function assertUnshare(
  harness: AccountTestHarness,
  baseUrl: string,
  headers: Record<string, string>,
  recordId: string,
  principalId: string,
  mutationId: string,
  resource = 'linkTag'
): Promise<void> {
  const unshared = await jsonFetch(harness, `${baseUrl}/datafn/mutation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      resource,
      version: 1,
      operation: 'unshare',
      id: recordId,
      clientId: 'account-smoke',
      mutationId,
      shareWith: {
        principalId
      }
    })
  });
  assert.equal(unshared.response.status, 200);
  assert.equal(unshared.body.ok, true);
  assert.equal(unshared.body.result.ok, true);
}

async function sharedWithMeQuery(
  harness: AccountTestHarness,
  baseUrl: string,
  headers: Record<string, string>,
  id: string
): Promise<{ response: Response; body: any }> {
  return jsonFetch(harness, `${baseUrl}/datafn/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      resource: 'linkTag',
      version: 1,
      filters: {
        id
      },
      metadata: {
        accessMode: 'sharedWithMe'
      },
      select: ['id', 'label']
    })
  });
}

async function serverSearch(
  harness: AccountTestHarness,
  baseUrl: string,
  headers: Record<string, string>,
  query: string,
  resources: string[]
): Promise<{ response: Response; body: any }> {
  return jsonFetch(harness, `${baseUrl}/datafn/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      resources,
      limit: 20
    })
  });
}

async function jsonFetch(
  harness: AccountTestHarness,
  url: string,
  init?: RequestInit
): Promise<{ response: Response; body: any }> {
  const response = await harness.app.fetch(new Request(url, init));
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return {
    response,
    body
  };
}

function readString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  assert.ok(value.length > 0, `${label} must not be empty`);
  return value;
}
