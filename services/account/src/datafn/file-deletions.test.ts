import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSchema } from '@filefn/server';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { wrapWithSchema, type Adapter } from '@superfunctions/db';
import type { StorageAdapter } from '@superfunctions/storage';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import type { FileFn } from '@filefn/server';
import {
  createFileDeletionCascade,
  fileRecordDeletions,
  FILE_DELETIONS_MODEL
} from './file-deletions.js';

const base = 'http://127.0.0.1:8787';
type Headers = Record<string, string>;

interface Fixture {
  harness: AccountTestHarness;
  fileDatabase: Adapter;
  deletedKeys: string[];
  failFileFn: { next: boolean };
  deferred: Promise<unknown>[];
}

/** FileFn database that throws on the next `files` lookup while `failFileFn.next` is set. */
function failingWhenFlagged(database: Adapter, failFileFn: { next: boolean }): Adapter {
  return {
    ...database,
    findOne: async (params) => {
      if (failFileFn.next && params.model === 'files') {
        failFileFn.next = false;
        throw new Error('FileFn database unavailable');
      }
      return database.findOne(params);
    }
  } as Adapter;
}

function createFixture(): Fixture {
  const fileDatabase = memoryAdapter({ debug: false });
  const deletedKeys: string[] = [];
  const failFileFn = { next: false };
  const deferred: Promise<unknown>[] = [];
  const storage = {
    name: 'test-storage',
    capabilities: {
      signedUploadUrls: false,
      signedDownloadUrls: false,
      multipart: false,
      proxyStreamingUpload: false,
      proxyStreamingDownload: false
    },
    statObject: async ({ key }: { key: string }) => ({ key, size: 0 }),
    deleteObject: async ({ key }: { key: string }) => {
      deletedKeys.push(key);
    }
  } as unknown as StorageAdapter;
  const harness = createAccountTestHarness({
    enableRateLimit: false,
    files: {
      database: failingWhenFlagged(fileDatabase, failFileFn),
      storage: () => storage,
      // Worker-style host: work deferred past the response, awaited by `call`.
      runtime: { defer: (work) => { deferred.push(work); } }
    }
  });
  return { harness, fileDatabase, deletedKeys, failFileFn, deferred };
}

/** Sends a request and waits for the work it deferred past the response. */
async function call(
  target: AccountTestHarness | Fixture,
  path: string,
  headers: Headers,
  body?: unknown
) {
  const harness = 'harness' in target ? target.harness : target;
  const response = await harness.app.fetch(new Request(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  }));
  if ('harness' in target) {
    while (target.deferred.length > 0) {
      await Promise.all(target.deferred.splice(0));
    }
  }
  return response;
}

async function signUp(harness: AccountTestHarness): Promise<Headers> {
  const response = await call(harness, '/auth/sign-up/password', { origin: base }, {
    email: `files-${randomUUID()}@example.test`,
    password: [randomUUID().toUpperCase(), randomUUID(), '!'].join(''),
    sessionMode: 'hybrid'
  });
  expect(response.status).toBe(200);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]);
  const csrf = cookies.find((cookie) => cookie.startsWith('nucleus.csrf='))?.split('=')[1] ?? '';
  return { cookie: cookies.join('; '), 'x-authfn-csrf': csrf, origin: base };
}

let mutationSequence = 0;

function fileMutation(
  operation: string,
  id: string,
  record?: Record<string, unknown>
): Record<string, unknown> {
  mutationSequence += 1;
  return {
    resource: 'file',
    version: 1,
    operation,
    id,
    ...(record ? { record } : {}),
    clientId: 'file-deletions-test',
    mutationId: `file-deletions-${mutationSequence}`
  };
}

async function pushAll(
  fixture: Fixture,
  user: Headers,
  mutations: Record<string, unknown>[]
): Promise<Response> {
  return call(fixture, '/datafn/push', user, { clientId: 'file-deletions-test', mutations });
}

async function push(
  fixture: Fixture,
  user: Headers,
  operation: string,
  id: string,
  record?: Record<string, unknown>
): Promise<Response> {
  return pushAll(fixture, user, [fileMutation(operation, id, record)]);
}

function fileRecord(recordId: string, fileId: string): Record<string, unknown> {
  return {
    id: recordId,
    label: 'photo.png',
    type: 'image/png',
    size: 4,
    name: 'photo.png',
    fileId
  };
}

/** Creates a `file` record pointing at a new FileFn file owned by the record's actor. */
async function createFileRecord(
  fixture: Fixture,
  user: Headers,
  fileId = `file_${randomUUID()}`,
  ownerOverride?: string
): Promise<{ recordId: string; fileId: string; storageKey: string; ownerId: string }> {
  const recordId = `file:${randomUUID()}`;
  const response = await push(fixture, user, 'insert', recordId, fileRecord(recordId, fileId));
  expect(response.status).toBe(200);
  const [row] = await fixture.harness.datafnDatabase.findMany<Record<string, unknown>>({
    model: 'file',
    where: [{ field: 'id', operator: 'eq', value: recordId }]
  });
  const ownerId = ownerOverride ?? String(row?.createdBy);
  const storageKey = await createFileFnFile(fixture, fileId, ownerId);
  return { recordId, fileId, storageKey, ownerId };
}

/** Stores a FileFn file with one version, unless it already exists. */
async function createFileFnFile(
  fixture: Fixture,
  fileId: string,
  ownerId: string
): Promise<string> {
  const storageKey = `files/${fileId}/v1`;
  if (!(await fileExists(fixture, fileId))) {
    const files = wrapWithSchema(fixture.fileDatabase, getSchema({ namespace: 'filefn' }));
    const now = new Date().toISOString();
    await files.create({
      model: 'files',
      namespace: 'filefn',
      data: {
        fileId,
        currentVersionId: `${fileId}_v1`,
        ownerId,
        tenantId: null,
        visibility: 'private',
        policy: 'default',
        mimeType: 'image/png',
        size: 4,
        name: 'photo.png',
        metadata: {},
        createdAt: now,
        updatedAt: now
      }
    });
    await files.create({
      model: 'fileVersions',
      namespace: 'filefn',
      data: {
        versionId: `${fileId}_v1`,
        fileId,
        storageKey,
        mimeType: 'image/png',
        size: 4,
        checksumSha256Base64: null,
        tenantId: null,
        createdAt: now
      }
    });
  }
  return storageKey;
}

async function recordExists(fixture: Fixture, recordId: string): Promise<boolean> {
  const rows = await fixture.harness.datafnDatabase.findMany({
    model: 'file',
    where: [{ field: 'id', operator: 'eq', value: recordId }]
  });
  return rows.length > 0;
}

async function fileExists(fixture: Fixture, fileId: string): Promise<boolean> {
  const files = wrapWithSchema(fixture.fileDatabase, getSchema({ namespace: 'filefn' }));
  const file = await files.findOne({
    model: 'files',
    where: [{ field: 'fileId', operator: 'eq', value: fileId }],
    namespace: 'filefn'
  });
  return file !== null;
}

async function pendingDeletions(fixture: Fixture): Promise<Record<string, unknown>[]> {
  return fixture.harness.datafnDatabase.findMany<Record<string, unknown>>({
    model: FILE_DELETIONS_MODEL,
    where: []
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('file record deletion cascade', () => {
  it('deletes the FileFn file and its stored object when a file record is permanently deleted', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const file = await createFileRecord(fixture, user);

    expect((await push(fixture, user, 'trash', file.recordId)).status).toBe(200);
    expect((await push(fixture, user, 'delete', file.recordId)).status).toBe(200);

    expect(await fileExists(fixture, file.fileId)).toBe(false);
    expect(fixture.deletedKeys).toEqual([file.storageKey]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('keeps the FileFn file when the record is only trashed', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const file = await createFileRecord(fixture, user);

    expect((await push(fixture, user, 'trash', file.recordId)).status).toBe(200);

    expect(await fileExists(fixture, file.fileId)).toBe(true);
    expect(fixture.deletedKeys).toEqual([]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('deletes through the mutation route, singly and in a batch', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const single = await createFileRecord(fixture, user);
    const batched = await createFileRecord(fixture, user);
    const trashed = await createFileRecord(fixture, user);

    expect((await call(fixture, '/datafn/mutation', user,
      fileMutation('delete', single.recordId))).status).toBe(200);
    expect((await call(fixture, '/datafn/mutation', user, [
      fileMutation('trash', trashed.recordId),
      fileMutation('delete', batched.recordId)
    ])).status).toBe(200);

    expect(await recordExists(fixture, single.recordId)).toBe(false);
    expect(await recordExists(fixture, batched.recordId)).toBe(false);
    expect(await fileExists(fixture, single.fileId)).toBe(false);
    expect(await fileExists(fixture, batched.fileId)).toBe(false);
    expect(await fileExists(fixture, trashed.fileId)).toBe(true);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('deletes through the transact route, with wrapped and bare mutation steps', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const wrapped = await createFileRecord(fixture, user);
    const bare = await createFileRecord(fixture, user);

    const response = await call(fixture, '/datafn/transact', user, {
      atomic: false,
      steps: [
        { mutation: fileMutation('delete', wrapped.recordId) },
        fileMutation('delete', bare.recordId)
      ]
    });

    expect(response.status).toBe(200);
    expect(await recordExists(fixture, wrapped.recordId)).toBe(false);
    expect(await recordExists(fixture, bare.recordId)).toBe(false);
    expect(await fileExists(fixture, wrapped.fileId)).toBe(false);
    expect(await fileExists(fixture, bare.fileId)).toBe(false);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('deletes the file a record pointed at when it was deleted later in the same request', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const existing = await createFileRecord(fixture, user);
    const replacementId = `file_${randomUUID()}`;
    await createFileFnFile(fixture, replacementId, existing.ownerId);
    const insertedRecordId = `file:${randomUUID()}`;
    const insertedFileId = `file_${randomUUID()}`;
    await createFileFnFile(fixture, insertedFileId, existing.ownerId);

    const response = await pushAll(fixture, user, [
      fileMutation('merge', existing.recordId, { fileId: replacementId }),
      fileMutation('delete', existing.recordId),
      fileMutation('insert', insertedRecordId, fileRecord(insertedRecordId, insertedFileId)),
      fileMutation('delete', insertedRecordId)
    ]);

    expect(response.status).toBe(200);
    expect(await recordExists(fixture, existing.recordId)).toBe(false);
    expect(await recordExists(fixture, insertedRecordId)).toBe(false);
    expect(await fileExists(fixture, existing.fileId)).toBe(false);
    expect(await fileExists(fixture, replacementId)).toBe(false);
    expect(await fileExists(fixture, insertedFileId)).toBe(false);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('answers the push when the FileFn delete fails and retries it after a later request', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const file = await createFileRecord(fixture, user);

    fixture.failFileFn.next = true;
    const response = await push(fixture, user, 'delete', file.recordId);

    expect(response.status).toBe(200);
    expect(await recordExists(fixture, file.recordId)).toBe(false);
    expect(await fileExists(fixture, file.fileId)).toBe(true);
    const [pending] = await pendingDeletions(fixture);
    expect(pending).toMatchObject({ fileId: file.fileId, attempts: 1 });
    expect(String(pending?.lastError)).toContain('FileFn database unavailable');

    // Any authenticated DataFn request sweeps due deletions, at most once a minute.
    vi.setSystemTime(Date.now() + 2 * 60 * 1000);
    expect((await pushAll(fixture, user, [])).status).toBe(200);

    expect(await fileExists(fixture, file.fileId)).toBe(false);
    expect(fixture.deletedKeys).toEqual([file.storageKey]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('keeps a FileFn file that another file record still references', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const first = await createFileRecord(fixture, user);
    const second = await createFileRecord(fixture, user, first.fileId);

    expect((await push(fixture, user, 'delete', first.recordId)).status).toBe(200);

    expect(await fileExists(fixture, first.fileId)).toBe(true);
    expect(await pendingDeletions(fixture)).toEqual([]);

    expect((await push(fixture, user, 'delete', second.recordId)).status).toBe(200);
    expect(await fileExists(fixture, first.fileId)).toBe(false);
  });

  it('never deletes a FileFn file owned by another account', async () => {
    const fixture = createFixture();
    const owner = await signUp(fixture.harness);
    const other = await signUp(fixture.harness);
    const victim = await createFileRecord(fixture, owner);
    const attacker = await createFileRecord(fixture, other, victim.fileId);
    const insertedRecordId = `file:${randomUUID()}`;

    expect((await push(fixture, other, 'delete', attacker.recordId)).status).toBe(200);
    expect((await pushAll(fixture, other, [
      fileMutation('insert', insertedRecordId, fileRecord(insertedRecordId, victim.fileId)),
      fileMutation('delete', insertedRecordId)
    ])).status).toBe(200);

    expect(await fileExists(fixture, victim.fileId)).toBe(true);
    expect(fixture.deletedKeys).toEqual([]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });
});

describe('retrying pending deletions', () => {
  it('settles each due deletion once when cleanup runs overlap', async () => {
    const database = memoryAdapter({ debug: false });
    const deleteFile = vi.fn(async (_fileId: string) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    const fileFn = { services: { files: { deleteFile } } } as unknown as FileFn;
    let clock = 1_000_000;
    const cascade = createFileDeletionCascade({
      database,
      getFileFn: async () => fileFn,
      now: () => clock,
      sweepThrottle: { lastSweepAt: Number.NEGATIVE_INFINITY }
    });
    for (const fileId of ['file_a', 'file_b']) {
      await database.create({
        model: FILE_DELETIONS_MODEL,
        data: {
          id: randomUUID(),
          principalId: 'user_1',
          fileId,
          attempts: 0,
          nextAttemptAt: clock - 1,
          lastError: null,
          createdAt: clock - 1
        }
      });
    }
    clock += 1;

    const results = await Promise.all([cascade.retryDue(), cascade.retryDue()]);

    expect(results.reduce((total, result) => total + result.deleted, 0)).toBe(2);
    expect(deleteFile.mock.calls.map(([fileId]) => fileId).sort()).toEqual(['file_a', 'file_b']);
    expect(await database.findMany({ model: FILE_DELETIONS_MODEL, where: [] })).toEqual([]);
  });
});

describe('fileRecordDeletions', () => {
  it('lists permanent file deletes from push, mutation and transact payloads only', () => {
    const remove = { resource: 'file', operation: 'delete', id: 'file:a' };
    const deleted = [{ recordId: 'file:a', fileIds: [] }];
    expect(fileRecordDeletions('push', { mutations: [
      remove,
      { resource: 'file', operation: 'trash', id: 'file:b' },
      { resource: 'node', operation: 'delete', id: 'node:c' }
    ] })).toEqual(deleted);
    expect(fileRecordDeletions('mutation', remove)).toEqual(deleted);
    expect(fileRecordDeletions('mutation', [remove])).toEqual(deleted);
    expect(fileRecordDeletions('transact', { steps: [{ mutation: remove }, { query: {} }] }))
      .toEqual(deleted);
    expect(fileRecordDeletions('transact', { steps: [remove] })).toEqual(deleted);
    expect(fileRecordDeletions('transact', { steps: [{ query: {}, mutation: remove }] }))
      .toEqual([]);
    expect(fileRecordDeletions('pull', { mutations: [remove] })).toEqual([]);
    expect(fileRecordDeletions('push', { mutations: [{ ...remove, id: 7 }, null] })).toEqual([]);
  });

  it('carries file ids set earlier in the request to the deletion', () => {
    expect(fileRecordDeletions('push', { mutations: [
      { resource: 'file', operation: 'delete', id: 'file:a' },
      { resource: 'file', operation: 'insert', id: 'file:a', record: { fileId: 'F1' } },
      { resource: 'file', operation: 'merge', id: 'file:a', record: { fileId: 'F2' } },
      { resource: 'file', operation: 'merge', id: 'file:b', record: { fileId: 'F3' } },
      { resource: 'file', operation: 'delete', id: 'file:a' }
    ] })).toEqual([
      { recordId: 'file:a', fileIds: [] },
      { recordId: 'file:a', fileIds: ['F1', 'F2'] }
    ]);
  });
});
