import { randomUUID } from 'node:crypto';
import type { DataFnAction } from '@datafn/server';
import { FileFnError, type FileFn, type FileFnRuntime } from '@filefn/server';
import {
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
}

/**
 * Deletes the FileFn file behind a `file` record once that record is
 * permanently deleted through DataFn. Trashing is a merge and never cascades.
 */
export interface FileDeletionCascade {
  /**
   * Records a pending deletion for every `file` record a `push`, `mutation`
   * or `transact` payload permanently deletes, before DataFn runs it. Pending
   * rows stay leased for ten minutes so the cleanup run leaves them to the
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
   * Cleanup-cron entry point: settles up to `limit` pending deletions whose
   * lease or backoff has elapsed, oldest first.
   */
  retryDue(options?: { limit?: number }): Promise<FileDeletionRetryResult>;
}

/** Creates the `file` record deletion cascade over the regional sync database. */
export function createFileDeletionCascade(
  input: CreateFileDeletionCascadeInput
): FileDeletionCascade {
  const now = input.now ?? Date.now;
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

  return {
    async capture(action, payload, principalId) {
      const namespace = resolveAccountUserNamespace(principalId);
      const pending: PendingFileDeletion[] = [];
      const seen = new Set<string>();
      for (const recordId of deletedFileRecordIds(action, payload)) {
        const fileId = await referencedFileId(namespace, recordId);
        if (!fileId || seen.has(fileId)) continue;
        seen.add(fileId);
        const entry: PendingFileDeletion = {
          id: randomUUID(),
          principalId,
          fileId,
          attempts: 0
        };
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
        pending.push(entry);
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
    async retryDue(options = {}) {
      const rows = await table.findMany<Record<string, unknown>>({
        model: FILE_DELETIONS_MODEL,
        where: [{ field: 'nextAttemptAt', operator: 'lte', value: now() }],
        orderBy: [{ field: 'nextAttemptAt', direction: 'asc' }],
        limit: options.limit ?? DEFAULT_RETRY_LIMIT
      });
      const result: FileDeletionRetryResult = { deleted: 0, kept: 0, retrying: 0 };
      for (const row of rows) {
        const outcome = await settleOne({
          id: String(row.id),
          principalId: String(row.principalId),
          fileId: String(row.fileId),
          attempts: Number(row.attempts ?? 0)
        });
        result[outcome] += 1;
      }
      return result;
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
 * Lists the ids of `file` records a DataFn write payload permanently deletes.
 * `trash` is not a deletion. Malformed entries are skipped; DataFn rejects
 * them itself.
 */
export function deletedFileRecordIds(action: DataFnAction, payload: unknown): string[] {
  const mutations: unknown[] = [];
  if (action === 'push' && isRecord(payload) && Array.isArray(payload.mutations)) {
    mutations.push(...payload.mutations);
  } else if (action === 'mutation') {
    mutations.push(...(Array.isArray(payload) ? payload : [payload]));
  } else if (action === 'transact' && isRecord(payload) && Array.isArray(payload.steps)) {
    for (const step of payload.steps) {
      if (isRecord(step) && 'mutation' in step) mutations.push(step.mutation);
    }
  }
  const ids: string[] = [];
  for (const mutation of mutations) {
    if (
      isRecord(mutation) &&
      mutation.resource === FILE_RESOURCE &&
      mutation.operation === 'delete' &&
      typeof mutation.id === 'string' &&
      mutation.id.length > 0
    ) {
      ids.push(mutation.id);
    }
  }
  return ids;
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
