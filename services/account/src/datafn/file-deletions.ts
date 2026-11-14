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
  /** The deleted `file` record; the deletion is owed only while it stays gone. */
  recordId: string;
  attempts: number;
}

/** What happened to one pending deletion. */
export type FileDeletionOutcome = 'deleted' | 'kept' | 'retrying';

/**
 * One mutation of a DataFn write payload: its position in the list DataFn
 * answers per mutation (push mutations, mutation batch, transact steps) and
 * the identifiers its result carries.
 */
export interface FileRecordWrite {
  slot: number;
  recordId: string;
  mutationId?: string;
}

/** A `file` record a write permanently deletes, with the FileFn ids it may reference. */
export interface FileRecordDeletion {
  recordId: string;
  /** The `delete` mutation. */
  write: FileRecordWrite;
  /**
   * FileFn ids that earlier `insert`, `merge` or `replace` mutations in the
   * same request set on the record, in request order, with the mutation that
   * set each. The stored value is read separately.
   */
  fileIds: { fileId: string; write: FileRecordWrite }[];
}

/** A FileFn id set and deleted within one request, owed only if DataFn applied both writes. */
interface RequestFileDeletion {
  fileId: string;
  recordId: string;
  writes: FileRecordWrite[];
}

/** Deletions one DataFn write may owe, captured before DataFn runs it. */
export interface CapturedFileDeletions {
  action: DataFnAction;
  payload: unknown;
  principalId: string;
  /** Rows for the stored `fileId` of each deleted record, written before DataFn ran. */
  stored: PendingFileDeletion[];
  /** File ids the request itself set on a record it then deleted. */
  requested: RequestFileDeletion[];
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
 * A file is deleted only when a record DataFn applied in the principal's
 * namespace referenced it, DataFn applied that record's deletion, no other
 * record in the namespace references it and FileFn reports the principal as
 * its owner. The caller passes only sessions that `/files` would accept.
 */
export interface FileDeletionCascade {
  /**
   * Reads what a `push`, `mutation` or `transact` payload may orphan by
   * permanently deleting `file` records, before DataFn runs it. Each deleted
   * record's stored `fileId` gets a pending row, leased for ten minutes so
   * the cleanup run leaves it to the request; a `fileId` an earlier mutation
   * in the same request set on the record is held in memory until DataFn
   * answers. Null when nothing is deleted. A storage failure rejects so the
   * write is refused and retried by the client instead of orphaning the file.
   */
  capture(
    action: DataFnAction,
    payload: unknown,
    principalId: string
  ): Promise<CapturedFileDeletions | null>;
  /**
   * Settles captured deletions with the DataFn response body. A request-set
   * `fileId` counts only when the body reports both the write that set it and
   * the delete as applied; its pending row is written before this resolves,
   * so every owed deletion is durable before any FileFn call starts. The
   * FileFn and storage work then runs in the background and never holds the
   * response; each deletion is settled as described on the interface, and a
   * failure or cut-off leaves the row for the cleanup run with exponential
   * backoff. Never rejects, so the write response is unaffected.
   */
  settle(captured: CapturedFileDeletions, responseBody: unknown): Promise<void>;
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

  const findRecord = (
    namespace: string,
    recordId: string
  ): Promise<Record<string, unknown> | null> =>
    records.findOne<Record<string, unknown>>({
      model: FILE_RESOURCE,
      where: [{ field: 'id', operator: 'eq', value: recordId }],
      namespace
    });

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
      if (
        (await findRecord(namespace, pending.recordId)) ||
        (await stillReferenced(namespace, pending.fileId))
      ) {
        await table.delete({ model: FILE_DELETIONS_MODEL, where: byId });
        return 'kept';
      }
      const fileFn = await input.getFileFn();
      if (!fileFn) {
        throw new Error('FileFn is not configured for this region');
      }
      const outcome = await deleteOwnedFile(fileFn, pending);
      await table.delete({ model: FILE_DELETIONS_MODEL, where: byId });
      return outcome;
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

  const record = async (
    principalId: string,
    fileId: string,
    recordId: string
  ): Promise<PendingFileDeletion> => {
    const entry: PendingFileDeletion = {
      id: randomUUID(),
      principalId,
      fileId,
      recordId,
      attempts: 0
    };
    const createdAt = now();
    await table.create({
      model: FILE_DELETIONS_MODEL,
      data: {
        id: entry.id,
        principalId,
        fileId,
        recordId,
        attempts: 0,
        nextAttemptAt: createdAt + CAPTURE_LEASE_MS,
        lastError: null,
        createdAt
      }
    });
    return entry;
  };

  /**
   * Writes a pending row for each request-set `fileId` the response reports
   * applied, so every owed deletion is durable before any FileFn or storage
   * call starts. A row that cannot be written is reported; DataFn has
   * already applied the write.
   */
  const recordApplied = async (
    captured: CapturedFileDeletions,
    responseBody: unknown
  ): Promise<PendingFileDeletion[]> => {
    if (captured.requested.length === 0) return [];
    const applied = appliedWrites(captured.action, captured.payload, responseBody);
    const owed: PendingFileDeletion[] = [];
    for (const candidate of captured.requested) {
      if (!candidate.writes.every(applied)) continue;
      try {
        owed.push(await record(captured.principalId, candidate.fileId, candidate.recordId));
      } catch (error) {
        report(error, 0);
      }
    }
    return owed;
  };

  /**
   * Runs FileFn work past the response: through the host's `defer` hook when
   * it has one (Worker `waitUntil`), otherwise detached, as on Node. Work cut
   * off midway leaves its leased rows for {@link FileDeletionCascade.sweep}.
   */
  const runInBackground = (work: Promise<unknown>): void => {
    const settled = work.then(
      () => undefined,
      (error: unknown) => report(error, 0)
    );
    input.runtime?.defer?.(settled);
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
        recordId: String(row.recordId),
        attempts: Number(row.attempts ?? 0)
      });
      result[outcome] += 1;
    }
    return result;
  };

  return {
    async capture(action, payload, principalId) {
      const deletions = fileRecordDeletions(action, payload);
      if (deletions.length === 0) return null;
      const namespace = resolveAccountUserNamespace(principalId);
      const captured: CapturedFileDeletions = {
        action,
        payload,
        principalId,
        stored: [],
        requested: []
      };
      const seen = new Set<string>();
      for (const deletion of deletions) {
        const storedFileId = (await findRecord(namespace, deletion.recordId))?.fileId;
        if (
          typeof storedFileId === 'string' &&
          storedFileId.length > 0 &&
          !seen.has(storedFileId)
        ) {
          seen.add(storedFileId);
          captured.stored.push(await record(principalId, storedFileId, deletion.recordId));
        }
      }
      const requested = new Set<string>();
      for (const deletion of deletions) {
        for (const { fileId, write } of deletion.fileIds) {
          const key = JSON.stringify([deletion.recordId, fileId, write.slot, deletion.write.slot]);
          if (seen.has(fileId) || requested.has(key)) continue;
          requested.add(key);
          captured.requested.push({
            fileId,
            recordId: deletion.recordId,
            writes: [write, deletion.write]
          });
        }
      }
      return captured;
    },
    async settle(captured, responseBody) {
      const owed = [...captured.stored, ...(await recordApplied(captured, responseBody))];
      if (owed.length === 0) return;
      runInBackground((async () => {
        for (const entry of owed) {
          await settleOne(entry);
        }
      })());
    },
    retryDue,
    sweep() {
      const startedAt = now();
      const sinceLast = startedAt - sweepThrottle.lastSweepAt;
      if (sinceLast >= 0 && sinceLast < SWEEP_INTERVAL_MS) return;
      sweepThrottle.lastSweepAt = startedAt;
      runInBackground(retryDue({ limit: SWEEP_LIMIT }));
    }
  };
}

/**
 * Deletes the file only when FileFn reports the principal as its owner. A
 * grant, even one allowing delete, is not enough: the owner's own records may
 * still reference the file. A file that is already gone counts as deleted; a
 * file the principal cannot read or does not own is left in place and counts
 * as kept, which is final.
 */
async function deleteOwnedFile(
  fileFn: FileFn,
  pending: PendingFileDeletion
): Promise<'deleted' | 'kept'> {
  const actor = { principalId: pending.principalId };
  try {
    const file = await fileFn.services.files.getFile(pending.fileId, actor);
    if (file.ownerId !== pending.principalId) return 'kept';
    await fileFn.services.files.deleteFile(pending.fileId, actor);
    return 'deleted';
  } catch (error) {
    if (error instanceof FileFnError && error.status === 404) return 'deleted';
    if (error instanceof FileFnError && error.status === 403) return 'kept';
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
  const setFileIds = new Map<string, { fileId: string; write: FileRecordWrite }[]>();
  const deletions: FileRecordDeletion[] = [];
  for (const { slot, mutation } of writeMutations(action, payload)) {
    if (
      !isRecord(mutation) ||
      mutation.resource !== FILE_RESOURCE ||
      typeof mutation.id !== 'string' ||
      mutation.id.length === 0
    ) {
      continue;
    }
    const recordId = mutation.id;
    const write: FileRecordWrite = {
      slot,
      recordId,
      ...(typeof mutation.mutationId === 'string' && mutation.mutationId.length > 0
        ? { mutationId: mutation.mutationId }
        : {})
    };
    if (mutation.operation === 'delete') {
      deletions.push({ recordId, write, fileIds: [...(setFileIds.get(recordId) ?? [])] });
      continue;
    }
    const fileId = isRecord(mutation.record) ? mutation.record.fileId : undefined;
    if (
      typeof mutation.operation === 'string' &&
      RECORD_WRITE_OPERATIONS.has(mutation.operation) &&
      typeof fileId === 'string' &&
      fileId.length > 0
    ) {
      setFileIds.set(recordId, [...(setFileIds.get(recordId) ?? []), { fileId, write }]);
    }
  }
  return deletions;
}

/**
 * Reads which payload mutations DataFn reports as applied. `push` answers a
 * list of applied mutation ids, also on a 400 after a partial batch, so a
 * mutation counts only when its id is unique in the payload. `mutation` and
 * `transact` answer one result per mutation or step; it counts only when it
 * is `ok` and names the record. Anything else counts as not applied.
 */
function appliedWrites(
  action: DataFnAction,
  payload: unknown,
  body: unknown
): (write: FileRecordWrite) => boolean {
  if (!isRecord(body)) return () => false;
  if (action === 'push') {
    const applied = isRecord(body.result) && Array.isArray(body.result.applied)
      ? new Set(body.result.applied)
      : new Set();
    const counts = new Map<string, number>();
    for (const { mutation } of writeMutations(action, payload)) {
      const mutationId = isRecord(mutation) ? mutation.mutationId : undefined;
      if (typeof mutationId === 'string') {
        counts.set(mutationId, (counts.get(mutationId) ?? 0) + 1);
      }
    }
    return (write) =>
      write.mutationId !== undefined &&
      counts.get(write.mutationId) === 1 &&
      applied.has(write.mutationId);
  }
  if (body.ok !== true) return () => false;
  let results: unknown[] = [];
  if (action === 'mutation') {
    results = Array.isArray(payload)
      ? (Array.isArray(body.result) ? body.result : [])
      : [body.result];
  } else if (action === 'transact' && isRecord(body.result) && Array.isArray(body.result.results)) {
    results = body.result.results;
  }
  return (write) => {
    const result = results[write.slot];
    return (
      isRecord(result) &&
      result.ok === true &&
      Array.isArray(result.affectedIds) &&
      result.affectedIds.includes(write.recordId) &&
      (write.mutationId === undefined || result.mutationId === write.mutationId)
    );
  };
}

function writeMutations(
  action: DataFnAction,
  payload: unknown
): { slot: number; mutation: unknown }[] {
  const indexed = (list: unknown[]) => list.map((mutation, slot) => ({ slot, mutation }));
  if (action === 'push') {
    return isRecord(payload) && Array.isArray(payload.mutations) ? indexed(payload.mutations) : [];
  }
  if (action === 'mutation') {
    return indexed(Array.isArray(payload) ? payload : [payload]);
  }
  if (action !== 'transact' || !isRecord(payload) || !Array.isArray(payload.steps)) {
    return [];
  }
  const mutations: { slot: number; mutation: unknown }[] = [];
  payload.steps.forEach((step: unknown, slot: number) => {
    if (!isRecord(step) || step.query) return;
    if (step.mutation) mutations.push({ slot, mutation: step.mutation });
    else if (typeof step.operation === 'string') mutations.push({ slot, mutation: step });
  });
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
