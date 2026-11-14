import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSchema } from '@filefn/server';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { wrapWithSchema, type Adapter } from '@superfunctions/db';
import type { StorageAdapter } from '@superfunctions/storage';
import { createAccountTestHarness, type AccountTestHarness } from '../testing/harness.js';
import { deletedFileRecordIds, FILE_DELETIONS_MODEL } from './file-deletions.js';

const base = 'http://127.0.0.1:8787';
type Headers = Record<string, string>;

interface Fixture {
  harness: AccountTestHarness;
  fileDatabase: Adapter;
  deletedKeys: string[];
  failFileFn: { next: boolean };
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
      storage: () => storage
    }
  });
  return { harness, fileDatabase, deletedKeys, failFileFn };
}

async function call(harness: AccountTestHarness, path: string, headers: Headers, body?: unknown) {
  return harness.app.fetch(new Request(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  }));
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

async function push(
  harness: AccountTestHarness,
  user: Headers,
  operation: string,
  id: string,
  record?: Record<string, unknown>
): Promise<Response> {
  mutationSequence += 1;
  return call(harness, '/datafn/push', user, {
    clientId: 'file-deletions-test',
    mutations: [{
      resource: 'file',
      version: 1,
      operation,
      id,
      ...(record ? { record } : {}),
      clientId: 'file-deletions-test',
      mutationId: `file-deletions-${mutationSequence}`
    }]
  });
}

/** Creates a `file` record pointing at a new FileFn file owned by the record's actor. */
async function createFileRecord(
  fixture: Fixture,
  user: Headers,
  fileId = `file_${randomUUID()}`,
  ownerOverride?: string
): Promise<{ recordId: string; fileId: string; storageKey: string; ownerId: string }> {
  const recordId = `file:${randomUUID()}`;
  const response = await push(fixture.harness, user, 'insert', recordId, {
    id: recordId,
    label: 'photo.png',
    type: 'image/png',
    size: 4,
    name: 'photo.png',
    fileId
  });
  expect(response.status).toBe(200);
  const [row] = await fixture.harness.datafnDatabase.findMany<Record<string, unknown>>({
    model: 'file',
    where: [{ field: 'id', operator: 'eq', value: recordId }]
  });
  const ownerId = ownerOverride ?? String(row?.createdBy);
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
  return { recordId, fileId, storageKey, ownerId };
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

    expect((await push(fixture.harness, user, 'trash', file.recordId)).status).toBe(200);
    expect((await push(fixture.harness, user, 'delete', file.recordId)).status).toBe(200);

    expect(await fileExists(fixture, file.fileId)).toBe(false);
    expect(fixture.deletedKeys).toEqual([file.storageKey]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('keeps the FileFn file when the record is only trashed', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const file = await createFileRecord(fixture, user);

    expect((await push(fixture.harness, user, 'trash', file.recordId)).status).toBe(200);

    expect(await fileExists(fixture, file.fileId)).toBe(true);
    expect(fixture.deletedKeys).toEqual([]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('answers the push when the FileFn delete fails and deletes the file on the cleanup retry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const file = await createFileRecord(fixture, user);

    fixture.failFileFn.next = true;
    const response = await push(fixture.harness, user, 'delete', file.recordId);

    expect(response.status).toBe(200);
    expect(await fixture.harness.datafnDatabase.findMany({
      model: 'file',
      where: [{ field: 'id', operator: 'eq', value: file.recordId }]
    })).toEqual([]);
    expect(await fileExists(fixture, file.fileId)).toBe(true);
    const [pending] = await pendingDeletions(fixture);
    expect(pending).toMatchObject({ fileId: file.fileId, attempts: 1 });
    expect(String(pending?.lastError)).toContain('FileFn database unavailable');

    expect(await fixture.harness.services.retryFileDeletions())
      .toEqual({ deleted: 0, kept: 0, retrying: 0 });
    vi.setSystemTime(Date.now() + 2 * 60 * 1000);
    expect(await fixture.harness.services.retryFileDeletions())
      .toEqual({ deleted: 1, kept: 0, retrying: 0 });

    expect(await fileExists(fixture, file.fileId)).toBe(false);
    expect(fixture.deletedKeys).toEqual([file.storageKey]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });

  it('keeps a FileFn file that another file record still references', async () => {
    const fixture = createFixture();
    const user = await signUp(fixture.harness);
    const first = await createFileRecord(fixture, user);
    const second = await createFileRecord(fixture, user, first.fileId);

    expect((await push(fixture.harness, user, 'delete', first.recordId)).status).toBe(200);

    expect(await fileExists(fixture, first.fileId)).toBe(true);
    expect(await pendingDeletions(fixture)).toEqual([]);

    expect((await push(fixture.harness, user, 'delete', second.recordId)).status).toBe(200);
    expect(await fileExists(fixture, first.fileId)).toBe(false);
  });

  it('never deletes a FileFn file owned by another account', async () => {
    const fixture = createFixture();
    const owner = await signUp(fixture.harness);
    const other = await signUp(fixture.harness);
    const victim = await createFileRecord(fixture, owner);
    const attacker = await createFileRecord(fixture, other, victim.fileId);

    expect((await push(fixture.harness, other, 'delete', attacker.recordId)).status).toBe(200);

    expect(await fileExists(fixture, victim.fileId)).toBe(true);
    expect(fixture.deletedKeys).toEqual([]);
    expect(await pendingDeletions(fixture)).toEqual([]);
  });
});

describe('deletedFileRecordIds', () => {
  it('lists permanent file deletes from push, mutation and transact payloads only', () => {
    const remove = { resource: 'file', operation: 'delete', id: 'file:a' };
    expect(deletedFileRecordIds('push', { mutations: [
      remove,
      { resource: 'file', operation: 'trash', id: 'file:b' },
      { resource: 'node', operation: 'delete', id: 'node:c' }
    ] })).toEqual(['file:a']);
    expect(deletedFileRecordIds('mutation', remove)).toEqual(['file:a']);
    expect(deletedFileRecordIds('mutation', [remove])).toEqual(['file:a']);
    expect(deletedFileRecordIds('transact', { steps: [{ mutation: remove }, { query: {} }] }))
      .toEqual(['file:a']);
    expect(deletedFileRecordIds('pull', { mutations: [remove] })).toEqual([]);
    expect(deletedFileRecordIds('push', { mutations: [{ ...remove, id: 7 }, null] })).toEqual([]);
  });
});
