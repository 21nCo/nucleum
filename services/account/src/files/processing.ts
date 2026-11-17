import { NUCLEUM_PROCESSOR_DESCRIPTORS } from "@21n/file-processing/descriptors";
import { requireVerifiedPostgresUrl } from "@21n/file-processing/postgres-url";
import {
  createCloudflareFlowFnProvider,
  type CloudflareQueueBinding
} from "@filefn/processing/queues/cloudflare";
import {
  PROCESSING_QUEUE_NAME,
  type FileFnConfig,
  type ProcessingQueueBatch,
  type ProcessingQueueMessage,
  type Processor
} from "@filefn/server";
import { FILEFN_R2_ENV_KEYS, readAccountFileStorageConfig } from "./storage.js";

/**
 * Where an environment processes uploaded files: on the device (`local`), by
 * the account service's processing queue and container (`remote`), or both.
 */
export type FileProcessingMode = "local" | "remote" | "both";

/** FileFn's processing configuration. */
export type AccountFileProcessing = NonNullable<FileFnConfig["processing"]>;

const FILE_PROCESSING_MODES: readonly FileProcessingMode[] = ["local", "remote", "both"];

/** Mode used when the environment sets none. */
export const DEFAULT_FILE_PROCESSING_MODE: FileProcessingMode = "local";

/**
 * Redeliveries the processing queue makes after the first attempt: the
 * consumer's `max_retries` and the container's `FILEFN_PROCESSING_MAX_RETRIES`.
 */
export const FILE_PROCESSING_MAX_RETRIES = 3;

/** Delay before a job the container could not run is delivered again. */
export const FILE_PROCESSING_RETRY_DELAY_SECONDS = 30;

/** Port the processing container's job server listens on. */
export const FILE_PROCESSING_CONTAINER_PORT = 8080;

const CONTAINER_JOBS_URL = "http://file-processing.container/jobs";
/** Longest delay Cloudflare Queues accepts for `message.retry` (12 hours). */
export const MAX_FILE_PROCESSING_RETRY_DELAY_SECONDS = 43_200;

/**
 * Reads `FILEFN_PROCESSING_MODE`. Unset or blank is `local`; any other value
 * that is not `local`, `remote` or `both` throws, so a misconfigured Worker
 * fails its `/files` requests instead of silently skipping processing.
 */
export function readFileProcessingMode(value: unknown): FileProcessingMode {
  if (value === undefined || value === null || String(value).trim() === "") {
    return DEFAULT_FILE_PROCESSING_MODE;
  }
  const mode = String(value).trim().toLowerCase();
  const known = FILE_PROCESSING_MODES.find((item) => item === mode);
  if (!known) {
    throw new Error(
      `FILEFN_PROCESSING_MODE must be one of ${FILE_PROCESSING_MODES.join(", ")}; got ${JSON.stringify(value)}`
    );
  }
  return known;
}

/** True when the server processes uploads in this mode. */
export function usesServerProcessing(mode: FileProcessingMode): boolean {
  return mode !== "local";
}

/**
 * Worker processing: in `remote` and `both` modes every upload enqueues a
 * `filefn.processing` job on the region's queue for the container to run. The
 * Worker's processors only name the container's processors (FileFn builds the
 * job's idempotency key from them); they never run in the Worker. Returns
 * undefined in `local` mode, and throws when the mode needs the queue but the
 * Worker has no `FILEFN_PROCESSING_QUEUE` binding.
 */
export function createQueuedFileProcessing(input: {
  mode: FileProcessingMode;
  queue: CloudflareQueueBinding | undefined;
}): AccountFileProcessing | undefined {
  if (!usesServerProcessing(input.mode)) {
    return undefined;
  }
  if (!input.queue) {
    throw new Error(
      `fileProcessingMode ${input.mode} needs the FILEFN_PROCESSING_QUEUE binding`
    );
  }
  return {
    enabled: true,
    processors: containerProcessors(),
    flowFn: createCloudflareFlowFnProvider({ [PROCESSING_QUEUE_NAME]: input.queue })
  };
}

/**
 * Node processing: in `remote` and `both` modes FileFn runs the processors in
 * this process after the response, handing the work to its `runtime.defer`
 * hook. Returns undefined in `local` mode without loading the processors.
 */
export async function createInlineFileProcessing(input: {
  mode: FileProcessingMode;
  loadProcessors: () => Promise<Processor[]>;
}): Promise<AccountFileProcessing | undefined> {
  if (!usesServerProcessing(input.mode)) {
    return undefined;
  }
  return { enabled: true, processors: await input.loadProcessors() };
}

function containerProcessors(): Processor[] {
  return NUCLEUM_PROCESSOR_DESCRIPTORS.map((descriptor) => ({
    name: descriptor.name,
    supportedMimeTypes: [...descriptor.supportedMimeTypes],
    artifactKinds: [...descriptor.artifactKinds],
    async process() {
      return {
        success: false,
        artifacts: [],
        error: "FILEFN_PROCESSING_RUNS_IN_CONTAINER"
      };
    }
  }));
}

/** The part of a container Durable Object stub the consumer calls. */
export interface FileProcessingContainer {
  fetch(input: string, init: RequestInit): Promise<Response>;
}

/** Logger the consumer reports dropped and retried jobs to. */
export interface FileProcessingLogger {
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Creates the queue consumer that forwards each `filefn.processing` message to
 * the processing container's `POST /jobs`, one at a time, and acknowledges or
 * retries it from the answer:
 *
 * - 200 with an outcome: acknowledged, unless the outcome is `retry`, which
 *   is retried after `FILE_PROCESSING_RETRY_DELAY_SECONDS`;
 * - 400 or 413: acknowledged and logged, since sending it again cannot work;
 * - 503: retried after its `Retry-After` seconds, at most the 12 hours
 *   Cloudflare Queues allows;
 * - any other answer, an unreadable 200 body or an unreachable container:
 *   retried after `FILE_PROCESSING_RETRY_DELAY_SECONDS`.
 *
 * A job that keeps failing goes to the queue's dead-letter queue once its
 * retries run out.
 */
export function createFileProcessingConsumer(input: {
  container: () => FileProcessingContainer;
  logger: FileProcessingLogger;
}): { queue(batch: ProcessingQueueBatch): Promise<void> } {
  return {
    async queue(batch) {
      for (const message of batch.messages) {
        await forwardJob(message, input.container(), input.logger);
      }
    }
  };
}

async function forwardJob(
  message: ProcessingQueueMessage,
  container: FileProcessingContainer,
  logger: FileProcessingLogger
): Promise<void> {
  const context = { attempts: message.attempts, job: jobReference(message.body) };
  let response: Response;
  try {
    response = await container.fetch(CONTAINER_JOBS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job: message.body, attempts: message.attempts })
    });
  } catch (error) {
    logger.warn("nucleus file processing container unreachable", { ...context, error });
    message.retry({ delaySeconds: FILE_PROCESSING_RETRY_DELAY_SECONDS });
    return;
  }
  if (response.status === 200) {
    const status = await readOutcomeStatus(response);
    if (status === undefined) {
      logger.warn("nucleus file processing answer unreadable", context);
      message.retry({ delaySeconds: FILE_PROCESSING_RETRY_DELAY_SECONDS });
    } else if (status === "retry") {
      message.retry({ delaySeconds: FILE_PROCESSING_RETRY_DELAY_SECONDS });
    } else {
      message.ack();
    }
    return;
  }
  const retryAfter = response.headers.get("retry-after");
  await response.body?.cancel();
  if (response.status === 400 || response.status === 413) {
    logger.error("nucleus file processing job rejected", { ...context, status: response.status });
    message.ack();
    return;
  }
  const delaySeconds =
    response.status === 503 ? retryAfterSeconds(retryAfter) : FILE_PROCESSING_RETRY_DELAY_SECONDS;
  logger.warn("nucleus file processing job not run", { ...context, status: response.status });
  message.retry({ delaySeconds });
}

async function readOutcomeStatus(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { outcome?: { status?: unknown } } | null;
    const status = body?.outcome?.status;
    return typeof status === "string" && status ? status : undefined;
  } catch {
    return undefined;
  }
}

function retryAfterSeconds(value: string | null): number {
  const seconds = value && /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
  if (!Number.isSafeInteger(seconds) || seconds < 1) {
    return FILE_PROCESSING_RETRY_DELAY_SECONDS;
  }
  return Math.min(seconds, MAX_FILE_PROCESSING_RETRY_DELAY_SECONDS);
}

function jobReference(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const { fileId, versionId, jobId } = body as Record<string, unknown>;
  return { fileId, versionId, jobId };
}

const PROCESSING_DATABASE_URL_KEY = "FILEFN_PROCESSING_DATABASE_URL";

/**
 * Resolves the processing container's environment from the Worker's: the
 * region's R2 credentials and bucket (`FILEFN_R2_*`, with `{region}` in the
 * bucket replaced by `regionId`) and the region's FileFn database URL
 * (`FILEFN_PROCESSING_DATABASE_URL`, passed as `FILEFN_DATABASE_URL`). Each
 * value is a plain variable or a Secrets Store binding. A missing value, or
 * a database URL that does not verify a remote server's certificate
 * (exact `sslmode=verify-full` or `sslrootcert=system`, the container's own
 * rule), throws, so the container never starts without its storage or over
 * an unverified connection.
 */
export async function resolveFileProcessingContainerEnv(
  env: Record<string, unknown>,
  regionId: string
): Promise<Record<string, string>> {
  const keys = [...FILEFN_R2_ENV_KEYS, PROCESSING_DATABASE_URL_KEY];
  const values: Record<string, string | undefined> = {};
  for (const key of keys) {
    values[key] = await readEnvValue(env[key]);
  }
  const missing = keys.filter((key) => !values[key]);
  const storage = readAccountFileStorageConfig(values, regionId);
  if (missing.length > 0 || !storage) {
    throw new Error(`File processing container needs ${missing.join(", ")}`);
  }
  requireVerifiedPostgresUrl(values[PROCESSING_DATABASE_URL_KEY]!);
  return {
    FILEFN_R2_ACCOUNT_ID: storage.accountId,
    FILEFN_R2_ACCESS_KEY_ID: storage.accessKeyId,
    FILEFN_R2_SECRET_ACCESS_KEY: storage.secretAccessKey,
    FILEFN_R2_BUCKET: storage.bucket,
    FILEFN_DATABASE_URL: values[PROCESSING_DATABASE_URL_KEY]!,
    PORT: String(FILE_PROCESSING_CONTAINER_PORT)
  };
}

async function readEnvValue(value: unknown): Promise<string | undefined> {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }
  if (value && typeof (value as { get?: unknown }).get === "function") {
    const secret = await (value as { get(): Promise<string | null> }).get();
    return secret?.trim() || undefined;
  }
  return undefined;
}

/** Account services the scheduled file cleanup uses. */
export interface ScheduledFileCleanupServices {
  getFileFn(): Promise<{
    cleanupExpiredSessions(): Promise<{ deletedSessions: number; abortedMultipart: number }>;
  } | null>;
  retryFileDeletions(): Promise<{ deleted: number; kept: number; retrying: number }>;
}

/**
 * The hourly cron's file upkeep, in every `fileProcessingMode`: deletes
 * upload sessions that expired before completing (aborting their multipart
 * uploads) and retries FileFn deletions still owed for permanently deleted
 * `file` records. Each step runs even when the other fails; a failure is
 * logged and then rethrown, so the cron invocation is reported as failed.
 */
export async function runScheduledFileCleanup(
  services: ScheduledFileCleanupServices,
  logger: FileProcessingLogger & {
    info(message: string, context?: Record<string, unknown>): void;
  }
): Promise<void> {
  const failures: unknown[] = [];
  try {
    const fileFn = await services.getFileFn();
    if (fileFn) {
      const sessions = await fileFn.cleanupExpiredSessions();
      logger.info("nucleus account expired upload sessions cleaned", sessions);
    }
  } catch (error) {
    failures.push(error);
    logger.error("nucleus account expired upload cleanup failed", { error });
  }
  try {
    const deletions = await services.retryFileDeletions();
    logger.info("nucleus account file deletions retried", { ...deletions });
  } catch (error) {
    failures.push(error);
    logger.error("nucleus account file deletion retry failed", { error });
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, "Scheduled file cleanup failed");
  }
}
