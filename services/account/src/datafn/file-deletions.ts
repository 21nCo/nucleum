import { randomUUID } from 'node:crypto';
import type { DataFnAction } from '@datafn/server';
import { FileFnError, type FileFn, type FileFnRuntime } from '@filefn/server';
import {
  NotFoundError,
  wrapWithRowLevelNamespace,
  type Adapter,
  type WhereClause
} from '@superfunctions/db';
import { resolveAccountUserNamespace } from './namespace.js';

/** Model of the pending FileFn deletion table in the regional sync database. */
export const FILE_DELETIONS_MODEL = 'accountFileDeletions';

const FILE_RESOURCE = 'file';
const CAPTURE_LEASE_MS = 10 * 60 * 1000;
const RETRY_BASE_MS = 60 * 1000;
const RETRY_MAX_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETRY_LIMIT = 100;
const SWEEP_INTERVAL_MS = 60 * 1000;
const SWEEP_LIMIT = 20;
const RECORD_WRITE_OPERATIONS = new Set(['insert', 'merge', 'replace']);
const MAX_ERROR_LENGTH = 500;

/** One pending FileFn deletion owned by `principalId`. */
export interface PendingFileDeletion {
  id: string;
  principalId: string;
  fileId: string;
  attempts: number;
}

/** What happened to one pending deletion. */
export type FileDeletionOutcome = 'deleted' | 'kept' | 'retrying';

/** A `file` record a write permanently deletes, with the FileFn ids it may reference. */
export interface FileRecordDeletion {
  recordId: string;
  /**
   * FileFn ids that earlier `insert`, `merge` or `replace` mutations in the
   * same request set on the record, in request order. The stored value is
   * read separately.
   */
  fileIds: string[];
}

/** Totals from one cleanup run. */
export interface FileDeletionRetryResult {
  deleted: number;
  kept: number;
  retrying: number;
}

/** Dependencies of the `file` record deletion cascade. */
export interface CreateFileDeletionCascadeInput {
  /** Unscoped regional sync database holding the `file` records. */
  database: Adapter;
  /** Returns the region's FileFn, or null when file storage is not configured. */
  getFileFn: () => Promise<FileFn | null>;
  /** Host hook that keeps deferred work alive after the response. */
  runtime?: FileFnRuntime;
  /** Receives deletion failures; it must not throw. */
  onError?: (error: unknown, context: { attempts: number }) => void;
  /** Clock override for tests. */
  now?: () => number;
  /**
   * Shared throttle for {@link FileDeletionCascade.sweep}. Defaults to one
   * per process or Worker isolate, since the Worker builds a cascade per
   * request.
   */
  sweepThrottle?: { lastSweepAt: number };
}

const processSweepThrottle = { lastSweepAt: Number.NEGATIVE_INFINITY };

/**
 * Deletes the FileFn file behind a `file` record once that record is
 * permanently deleted through DataFn. Trashing is a merge and never cascades.
 */
export interface FileDeletionCascade {
  /**
   * Records a pending deletion for every FileFn file a `push`, `mutation`
   * or `transact` payload may orphan by permanently deleting a `file`
   * record, before DataFn runs it: the record's stored `fileId` and any
   * `fileId` an earlier mutation in the same request set on it. Pending rows
   * stay leased for ten minutes so the cleanup run leaves them to the
   * request. A storage failure rejects so the write is refused and retried
   * by the client instead of orphaning the file.
   */
  capture(
    action: DataFnAction,
    payload: unknown,
    principalId: string
  ): Promise<PendingFileDeletion[]>;
  /**
   * Settles pending deletions after DataFn answered: a file whose record is
   * gone and that no other `file` record in the namespace references is
   * deleted from FileFn; one still referenced is kept and its pending row
   * dropped; a FileFn failure leaves the row for the cleanup run with
   * exponential backoff. Never rejects, so the write response is unaffected.
   */
  settle(pending: readonly PendingFileDeletion[]): Promise<void>;
  /**
   * Settles up to `limit` pending deletions whose lease or backoff has
   * elapsed, oldest first. Each row is claimed with a fresh lease before it
   * is settled, so concurrent runs never settle the same row twice.
   */
  retryDue(options?: { limit?: number }): Promise<FileDeletionRetryResult>;
  /**
   * Retries due deletions in the background at most once a minute per
   * process or Worker isolate. The DataFn server calls it after each
   * authenticated request, so failed or interrupted deletions are retried in
   * every runtime without a scheduler. Never throws.
   */
  sweep(): void;
}

/** Creates the `file` record deletion cascade over the regional sync database. */
export function createFileDeletionCascade(
  input: CreateFileDeletionCascadeInput
): FileDeletionCascade {
  const now = input.now ?? Date.now;
  const sweepThrottle = input.sweepThrottle ?? processSweepThrottle;
  const records = wrapWithRowLevelNamespace(input.database, {
    enabled: true,
    columnName: '__ns',
    mandatory: true
  });
  const table = input.database;

  const report = (error: unknown, attempts: number): void => {
    try {
      input.onError?.(error, { attempts });
    } catch {
      return;
    }
  };

  const referencedFileId = async (
    namespace: string,
    recordId: string
  ): Promise<string | null> => {
    const record = await records.findOne<Record<string, unknown>>({
      model: FILE_RESOURCE,
      where: [{ field: 'id', operator: 'eq', value: recordId }],
      namespace
    });
    const fileId = record?.fileId;
    return typeof fileId === 'string' && fileId.length > 0 ? fileId : null;
  };

  const stillReferenced = async (
    namespace: string,
    fileId: string
  ): Promise<boolean> => {
    const referencing = await records.findMany<Record<string, unknown>>({
      model: FILE_RESOURCE,
      where: [{ field: 'fileId', operator: 'eq', value: fileId }],
      namespace,
      limit: 1
    });
    return referencing.length > 0;
  };

  const settleOne = async (
    pending: PendingFileDeletion
  ): Promise<FileDeletionOutcome> => {
    const byId: WhereClause[] = [{ field: 'id', operator: 'eq', value: pending.id }];
    try {
      const namespace = resolveAccountUserNamespace(pending.principalId);
      if (await stillReferenced(namespace, pending.fileId)) {
        await table.delete({ model: FILE_DELETIONS_MODEL, where: byId });
        return 'kept';
      }
      const fileFn = await input.getFileFn();
      if (!fileFn) {
        throw new Error('FileFn is not configured for this region');
      }
      await deleteFromFileFn(fileFn, pending);
      await table.delete({ model: FILE_DELETIONS_MODEL, where: byId });
      return 'deleted';
    } catch (error) {
      const attempts = pending.attempts + 1;
      report(error, attempts);
      try {
        await table.update({
          model: FILE_DELETIONS_MODEL,
          where: byId,
          data: {
            attempts,
            nextAttemptAt: now() + retryDelayMs(attempts),
            lastError: describeError(error)
          }
        });
      } catch (updateError) {
        report(updateError, attempts);
      }
      return 'retrying';
    }
  };

  const settle = async (pending: readonly PendingFileDeletion[]): Promise<void> => {
    for (const entry of pending) {
      await settleOne(entry);
    }
  };

  const record = async (principalId: string, fileId: string): Promise<PendingFileDeletion> => {
    const entry: PendingFileDeletion = { id: randomUUID(), principalId, fileId, attempts: 0 };
    const createdAt = now();
    await table.create({
      model: FILE_DELETIONS_MODEL,
      data: {
        id: entry.id,
        principalId,
        fileId,
        attempts: 0,
        nextAttemptAt: createdAt + CAPTURE_LEASE_MS,
        lastError: null,
        createdAt
      }
    });
    return entry;
  };

  /**
   * Moves a due row's lease forward in one conditional update; false when
   * another run claimed or settled it first. `update` is used rather than
   * `updateMany` because the postgres-js driver reports no affected-row count.
   */
  const claim = async (row: Record<string, unknown>): Promise<boolean> => {
    try {
      await table.update({
        model: FILE_DELETIONS_MODEL,
        where: [
          { field: 'id', operator: 'eq', value: row.id },
          { field: 'nextAttemptAt', operator: 'eq', value: row.nextAttemptAt }
        ],
        data: { nextAttemptAt: now() + CAPTURE_LEASE_MS }
      });
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) return false;
      throw error;
    }
  };

  const retryDue = async (
    options: { limit?: number } = {}
  ): Promise<FileDeletionRetryResult> => {
    const rows = await table.findMany<Record<string, unknown>>({
      model: FILE_DELETIONS_MODEL,
      where: [{ field: 'nextAttemptAt', operator: 'lte', value: now() }],
      orderBy: [{ field: 'nextAttemptAt', direction: 'asc' }],
      limit: options.limit ?? DEFAULT_RETRY_LIMIT
    });
    const result: FileDeletionRetryResult = { deleted: 0, kept: 0, retrying: 0 };
    for (const row of rows) {
      if (!(await claim(row))) continue;
      const outcome = await settleOne({
        id: String(row.id),
        principalId: String(row.principalId),
        fileId: String(row.fileId),
        attempts: Number(row.attempts ?? 0)
      });
      result[outcome] += 1;
    }
    return result;
  };

  return {
    async capture(action, payload, principalId) {
      const namespace = resolveAccountUserNamespace(principalId);
      const pending: PendingFileDeletion[] = [];
      const seen = new Set<string>();
      for (const deletion of fileRecordDeletions(action, payload)) {
        const stored = await referencedFileId(namespace, deletion.recordId);
        for (const fileId of [...(stored ? [stored] : []), ...deletion.fileIds]) {
          if (seen.has(fileId)) continue;
          seen.add(fileId);
          pending.push(await record(principalId, fileId));
        }
      }
      return pending;
    },
    async settle(pending) {
      if (pending.length === 0) return;
      const work = settle(pending);
      if (input.runtime?.defer) {
        input.runtime.defer(work);
        return;
      }
      await work;
    },
    retryDue,
    sweep() {
      const startedAt = now();
      const sinceLast = startedAt - sweepThrottle.lastSweepAt;
      if (sinceLast >= 0 && sinceLast < SWEEP_INTERVAL_MS) return;
      sweepThrottle.lastSweepAt = startedAt;
      const work = retryDue({ limit: SWEEP_LIMIT }).then(
        () => undefined,
        (error: unknown) => report(error, 0)
      );
      if (input.runtime?.defer) input.runtime.defer(work);
    }
  };
}

/**
 * Deletes the file as its owner. A file that is already gone counts as
 * deleted. A file the principal does not own is refused by FileFn and left
 * in place: the record named another owner's file, which this cascade must
 * never remove, so the refusal is final and also counts as settled.
 */
async function deleteFromFileFn(
  fileFn: FileFn,
  pending: PendingFileDeletion
): Promise<void> {
  try {
    await fileFn.services.files.deleteFile(pending.fileId, {
      principalId: pending.principalId
    });
  } catch (error) {
    if (error instanceof FileFnError && (error.status === 404 || error.status === 403)) {
      return;
    }
    throw error;
  }
}

/**
 * Lists the `file` records a DataFn write payload permanently deletes, in
 * request order, mirroring how DataFn reads `push`, `mutation` (single or
 * batch) and `transact` (wrapped or bare mutation steps). `trash` is not a
 * deletion. Malformed entries are skipped; DataFn rejects them itself.
 */
export function fileRecordDeletions(
  action: DataFnAction,
  payload: unknown
): FileRecordDeletion[] {
  const setFileIds = new Map<string, string[]>();
  const deletions: FileRecordDeletion[] = [];
  for (const mutation of writeMutations(action, payload)) {
    if (
      !isRecord(mutation) ||
      mutation.resource !== FILE_RESOURCE ||
      typeof mutation.id !== 'string' ||
      mutation.id.length === 0
    ) {
      continue;
    }
    const recordId = mutation.id;
    if (mutation.operation === 'delete') {
      deletions.push({ recordId, fileIds: [...(setFileIds.get(recordId) ?? [])] });
      continue;
    }
    const fileId = isRecord(mutation.record) ? mutation.record.fileId : undefined;
    if (
      typeof mutation.operation === 'string' &&
      RECORD_WRITE_OPERATIONS.has(mutation.operation) &&
      typeof fileId === 'string' &&
      fileId.length > 0
    ) {
      setFileIds.set(recordId, [...(setFileIds.get(recordId) ?? []), fileId]);
    }
  }
  return deletions;
}

function writeMutations(action: DataFnAction, payload: unknown): unknown[] {
  if (action === 'push') {
    return isRecord(payload) && Array.isArray(payload.mutations) ? payload.mutations : [];
  }
  if (action === 'mutation') {
    return Array.isArray(payload) ? payload : [payload];
  }
  if (action !== 'transact' || !isRecord(payload) || !Array.isArray(payload.steps)) {
    return [];
  }
  const mutations: unknown[] = [];
  for (const step of payload.steps) {
    if (!isRecord(step) || step.query) continue;
    if (step.mutation) mutations.push(step.mutation);
    else if (typeof step.operation === 'string') mutations.push(step);
  }
  return mutations;
}

function retryDelayMs(attempts: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.min(attempts - 1, 20), RETRY_MAX_MS);
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
