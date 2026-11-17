import { randomUUID } from 'node:crypto';
import { createNucleumProcessors, NUCLEUM_PROCESSOR_NAMES } from '@21n/file-processing';
import { createFileFn, createProcessingJobHandler, type FileFnRuntime, type Processor } from '@filefn/server';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { Hono } from 'hono';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFileDeferredWork } from './deferred.js';
import {
  createFileProcessingConsumer,
  createInlineFileProcessing,
  createQueuedFileProcessing,
  FILE_PROCESSING_RETRY_DELAY_SECONDS,
  readFileProcessingMode,
  resolveFileProcessingContainerEnv,
  runScheduledFileCleanup,
  type AccountFileProcessing,
  type FileProcessingMode
} from './processing.js';
import { registerAccountFileRoutes } from './routes.js';
import { createAccountFileFn, type AccountFileAuth } from './server.js';
import { createAccountFileStorage } from './storage.js';

const R2_ENDPOINT = 'https://r2.test';
const ORIGIN = 'http://account.test';
const OWNER = 'user:owner';
const ACTOR_HEADER = 'x-test-actor';
const R2_ENV = {
  FILEFN_R2_ACCOUNT_ID: 'test-account',
  FILEFN_R2_ACCESS_KEY_ID: 'access',
  FILEFN_R2_SECRET_ACCESS_KEY: 'secret',
  FILEFN_R2_BUCKET: 'nucleus-files-test-{region}'
};

/** An in-memory R2 bucket answering the S3 requests the R2 adapter and presigned PUTs send. */
function createR2Bucket() {
  const objects = new Map<string, { bytes: Uint8Array<ArrayBuffer>; contentType: string }>();
  const uploads = new Map<string, { contentType: string; parts: Map<number, Uint8Array<ArrayBuffer>> }>();
  async function handle(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== R2_ENDPOINT) throw new Error(`unexpected fetch to ${url.origin}`);
    const key = decodeURIComponent(url.pathname.split('/').slice(2).join('/'));
    const uploadId = url.searchParams.get('uploadId');
    const partNumber = url.searchParams.get('partNumber');
    switch (request.method) {
      case 'PUT': {
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (uploadId && partNumber) uploads.get(uploadId)?.parts.set(Number(partNumber), bytes);
        else objects.set(key, { bytes, contentType: request.headers.get('content-type') ?? '' });
        return new Response(null, { status: 200, headers: { etag: `"${randomUUID()}"` } });
      }
      case 'POST': {
        if (url.searchParams.has('uploads')) {
          const id = randomUUID();
          uploads.set(id, { contentType: request.headers.get('content-type') ?? '', parts: new Map() });
          return xml(`<InitiateMultipartUploadResult><UploadId>${id}</UploadId></InitiateMultipartUploadResult>`);
        }
        const upload = uploadId ? uploads.get(uploadId) : undefined;
        if (!upload) return xml('<Error><Code>NoSuchUpload</Code></Error>', 404);
        const parts = [...upload.parts.entries()].sort(([a], [b]) => a - b).map(([, bytes]) => bytes);
        objects.set(key, { bytes: concat(parts), contentType: upload.contentType });
        uploads.delete(uploadId!);
        return xml('<CompleteMultipartUploadResult><ETag>"done"</ETag></CompleteMultipartUploadResult>');
      }
      case 'HEAD':
      case 'GET': {
        const object = objects.get(key);
        if (!object) return xml('<Error><Code>NoSuchKey</Code></Error>', 404);
        const headers = {
          'content-length': String(object.bytes.byteLength),
          'content-type': object.contentType,
          etag: '"stored"'
        };
        return new Response(request.method === 'GET' ? object.bytes : null, { status: 200, headers });
      }
      case 'DELETE':
        if (uploadId) uploads.delete(uploadId);
        else objects.delete(key);
        return new Response(null, { status: 204 });
      default:
        return new Response(null, { status: 405 });
    }
  }
  return { objects, fetch: vi.fn(handle) };
}

function xml(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'application/xml' } });
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function headerAuth(): AccountFileAuth {
  const session = (request: Request) => {
    const actorId = request.headers.get(ACTOR_HEADER);
    return actorId ? { actorId, scopes: ['*'] } : null;
  };
  return {
    provider: { authenticate: vi.fn(async (request: Request) => session(request)) },
    authorizeMutation: vi.fn(async (request: Request) => session(request))
  } as unknown as AccountFileAuth;
}

/** A Workers Queue producer binding that records each message. */
function createQueue() {
  const sent: unknown[] = [];
  return { sent, send: vi.fn(async (body: unknown) => void sent.push(body)) };
}

/** A queue message as the Workers runtime delivers it, recording ack and retry. */
function message(body: unknown, attempts = 1) {
  return { body, attempts, ack: vi.fn(), retry: vi.fn() };
}

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

/** The account `/files` app over one region's bucket and FileFn database. */
function createFilesHarness(processing?: AccountFileProcessing, runtime?: FileFnRuntime) {
  const bucket = createR2Bucket();
  vi.stubGlobal('fetch', bucket.fetch);
  const storage = createAccountFileStorage(R2_ENV, 'insouth', { endpoint: R2_ENDPOINT, fetch: bucket.fetch })!;
  const database = memoryAdapter({ debug: false });
  const fileFn = createAccountFileFn({ auth: headerAuth(), database, storage, processing, runtime });
  const app = new Hono();
  registerAccountFileRoutes({ app, getFileFn: async () => fileFn });

  const postJson = async (path: string, body: unknown) => {
    const response = await app.fetch(
      new Request(`${ORIGIN}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [ACTOR_HEADER]: OWNER },
        body: JSON.stringify(body)
      })
    );
    expect(response.status, path).toBe(200);
    const json = (await response.json()) as { data?: any };
    return json.data ?? json;
  };

  return {
    bucket,
    database,
    storage,
    fileFn,
    /** Starts an upload as `OWNER` and returns its session ID, leaving it incomplete. */
    async startUpload(fileName: string, mimeType: string, size: number): Promise<string> {
      const { uploadSessionId } = await postJson('/files/upload/init', {
        policy: 'nucleus-durable-default',
        fileName,
        size,
        mimeType
      });
      return uploadSessionId;
    },
    /** Uploads `bytes` as `OWNER` through the signed-part flow and completes it. */
    async upload(fileName: string, mimeType: string, bytes: Uint8Array<ArrayBuffer>) {
      const { uploadSessionId } = await postJson('/files/upload/init', {
        policy: 'nucleus-durable-default',
        fileName,
        size: bytes.byteLength,
        mimeType
      });
      const { url, headers } = await postJson(`/files/upload/${uploadSessionId}/parts/1/sign`, {
        contentLength: bytes.byteLength
      });
      const put = await bucket.fetch(url, { method: 'PUT', headers, body: bytes });
      await postJson(`/files/upload/${uploadSessionId}/parts/1/complete`, {
        etag: put.headers.get('etag'),
        size: bytes.byteLength
      });
      return (await postJson(`/files/upload/${uploadSessionId}/complete`, {})) as { fileId: string; versionId: string };
    },
    async artifacts(fileId: string) {
      const response = await app.fetch(
        new Request(`${ORIGIN}/files/${fileId}/artifacts`, { headers: { [ACTOR_HEADER]: OWNER } })
      );
      const json = (await response.json()) as { data?: { artifacts: any[] }; artifacts?: any[] };
      return (json.data?.artifacts ?? json.artifacts ?? []) as Array<{ kind: string; mimeType: string; source?: string }>;
    }
  };
}

async function pngBytes(): Promise<Uint8Array<ArrayBuffer>> {
  const png = await sharp({ create: { width: 1024, height: 768, channels: 3, background: '#3366cc' } }).png().toBuffer();
  return new Uint8Array(png);
}

const EXPECTED_KEY_SUFFIX = [...NUCLEUM_PROCESSOR_NAMES].sort().join(',');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fileProcessingMode', () => {
  it('defaults to local when unset and rejects an unknown mode', () => {
    expect(readFileProcessingMode(undefined)).toBe('local');
    expect(readFileProcessingMode('  ')).toBe('local');
    expect(readFileProcessingMode(' Remote ')).toBe('remote');
    expect(readFileProcessingMode('both')).toBe('both');
    expect(() => readFileProcessingMode('container')).toThrow(/FILEFN_PROCESSING_MODE/);
  });
});

describe('account Worker processing producer per mode', () => {
  it('local: a completed upload enqueues nothing', async () => {
    const queue = createQueue();
    const files = createFilesHarness(createQueuedFileProcessing({ mode: 'local', queue }));
    const { fileId } = await files.upload('photo.png', 'image/png', await pngBytes());

    expect(queue.send).not.toHaveBeenCalled();
    expect(files.fileFn.services.processing.isEnabled()).toBe(false);
    expect(await files.artifacts(fileId)).toEqual([]);
  });

  it.each<FileProcessingMode>(['remote', 'both'])(
    '%s: a completed upload enqueues one job naming the container processors on the region queue',
    async (mode) => {
      const queue = createQueue();
      const files = createFilesHarness(createQueuedFileProcessing({ mode, queue }));
      const { fileId, versionId } = await files.upload('photo.png', 'image/png', await pngBytes());

      expect(queue.send).toHaveBeenCalledTimes(1);
      expect(queue.sent[0]).toMatchObject({
        fileId,
        versionId,
        mimeType: 'image/png',
        idempotencyKey: `processing:${fileId}:${versionId}:${EXPECTED_KEY_SUFFIX}`,
        jobId: expect.any(String)
      });
      // Nothing runs in the Worker: the container makes the artifacts.
      expect(await files.artifacts(fileId)).toEqual([]);
    }
  );

  it('refuses remote processing without the queue binding instead of running processors in the Worker', () => {
    expect(() => createQueuedFileProcessing({ mode: 'remote', queue: undefined })).toThrow(/FILEFN_PROCESSING_QUEUE/);
    expect(createQueuedFileProcessing({ mode: 'local', queue: undefined })).toBeUndefined();
  });
});

describe('account Node processing (local development)', () => {
  it('local: never loads the processors', async () => {
    const loadProcessors = vi.fn(async () => createNucleumProcessors());
    expect(await createInlineFileProcessing({ mode: 'local', loadProcessors })).toBeUndefined();
    expect(loadProcessors).not.toHaveBeenCalled();
  });

  it('remote: runs the Nucleum processors in process through the defer hook after the upload responds', async () => {
    const deferred = createFileDeferredWork();
    const ocrProvider = { recognize: vi.fn(async () => ({ text: 'recognized', confidence: 90 })) };
    const processing = await createInlineFileProcessing({
      mode: 'remote',
      loadProcessors: async () => createNucleumProcessors({ ocrProvider })
    });
    const files = createFilesHarness(processing, deferred.runtime);

    const { fileId } = await files.upload('photo.png', 'image/png', await pngBytes());
    expect(deferred.pending()).toBeGreaterThan(0);
    await deferred.settled();

    const artifacts = await files.artifacts(fileId);
    expect(artifacts.map((artifact) => artifact.kind).sort()).toEqual(['ocr-text', 'thumbnail-medium']);
    expect(artifacts.find((artifact) => artifact.kind === 'thumbnail-medium')).toMatchObject({
      mimeType: 'image/webp',
      source: 'server'
    });
    expect(ocrProvider.recognize).toHaveBeenCalledTimes(1);
  });
});

describe('processing queue consumer', () => {
  it('forwards a queued upload job to the container, which records the artifacts, and acknowledges it', async () => {
    const queue = createQueue();
    const files = createFilesHarness(createQueuedFileProcessing({ mode: 'remote', queue }));
    const { fileId } = await files.upload('photo.png', 'image/png', await pngBytes());

    // A fake container: the FILE-9 job server contract over the same database and bucket.
    const containerFileFn = createFileFn({
      database: files.database,
      storage: files.storage,
      namespace: 'filefn',
      processing: {
        enabled: true,
        processors: createNucleumProcessors({
          ocrProvider: { recognize: async () => ({ text: 'text', confidence: 90 }) }
        }) as Processor[]
      }
    });
    const handler = createProcessingJobHandler(containerFileFn, { maxRetries: 3 });
    const requests: Array<{ url: string; method?: string; body: unknown }> = [];
    const container = {
      fetch: vi.fn(async (url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { job: unknown; attempts: number };
        requests.push({ url, method: init.method, body });
        const outcome = await handler.handle(body.job, { attempts: body.attempts });
        return Response.json({ outcome });
      })
    };
    const delivered = message(queue.sent[0], 1);

    await createFileProcessingConsumer({ container: () => container, logger: logger() }).queue({
      messages: [delivered]
    });

    expect(requests).toEqual([
      { url: expect.stringMatching(/\/jobs$/), method: 'POST', body: { job: queue.sent[0], attempts: 1 } }
    ]);
    expect(delivered.ack).toHaveBeenCalledTimes(1);
    expect(delivered.retry).not.toHaveBeenCalled();
    const kinds = (await files.artifacts(fileId)).map((artifact) => artifact.kind).sort();
    expect(kinds).toEqual(['ocr-text', 'thumbnail-medium']);
  });

  it.each([
    ['a completed outcome', () => Response.json({ outcome: { status: 'completed', artifactsCreated: 1 } }), 'ack', undefined],
    ['a dropped outcome', () => Response.json({ outcome: { status: 'dropped', reason: 'version-deleted' } }), 'ack', undefined],
    ['a retry outcome', () => Response.json({ outcome: { status: 'retry' } }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    ['an unreadable 200 body', () => new Response('not json', { status: 200 }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    ['400 (malformed job)', () => new Response('{}', { status: 400 }), 'ack', undefined],
    ['413 (job too large)', () => new Response('{}', { status: 413 }), 'ack', undefined],
    ['503 with Retry-After', () => new Response('{}', { status: 503, headers: { 'retry-after': '120' } }), 'retry', 120],
    ['503 without Retry-After', () => new Response('{}', { status: 503 }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    ['401 (token)', () => new Response('{}', { status: 401 }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    ['500 (job threw)', () => new Response('{}', { status: 500 }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS]
  ] as const)('answers %s with %s', async (_label, respond, action, delaySeconds) => {
    const delivered = message({ fileId: 'f', versionId: 'v', idempotencyKey: 'k' }, 2);
    const log = logger();
    await createFileProcessingConsumer({
      container: () => ({ fetch: async () => respond() }),
      logger: log
    }).queue({ messages: [delivered] });

    if (action === 'ack') {
      expect(delivered.ack).toHaveBeenCalledTimes(1);
      expect(delivered.retry).not.toHaveBeenCalled();
    } else {
      expect(delivered.ack).not.toHaveBeenCalled();
      expect(delivered.retry).toHaveBeenCalledWith({ delaySeconds });
    }
  });

  it('retries a job when the container is unreachable and still forwards the rest of the batch', async () => {
    const first = message({ fileId: 'f1', versionId: 'v1', idempotencyKey: 'k1' });
    const second = message({ fileId: 'f2', versionId: 'v2', idempotencyKey: 'k2' });
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('container not ready'))
      .mockResolvedValueOnce(Response.json({ outcome: { status: 'completed', artifactsCreated: 0 } }));
    const log = logger();

    await createFileProcessingConsumer({ container: () => ({ fetch }), logger: log }).queue({
      messages: [first, second]
    });

    expect(first.retry).toHaveBeenCalledWith({ delaySeconds: FILE_PROCESSING_RETRY_DELAY_SECONDS });
    expect(first.ack).not.toHaveBeenCalled();
    expect(second.ack).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      'nucleus file processing container unreachable',
      expect.objectContaining({ job: { fileId: 'f1', versionId: 'v1', jobId: undefined } })
    );
  });
});

describe('processing container environment', () => {
  it('resolves Secrets Store values, the region bucket and the database URL', async () => {
    const secret = (value: string) => ({ get: async () => value });
    const env = await resolveFileProcessingContainerEnv(
      {
        FILEFN_R2_ACCOUNT_ID: secret('account'),
        FILEFN_R2_ACCESS_KEY_ID: secret('access'),
        FILEFN_R2_SECRET_ACCESS_KEY: secret('secret'),
        FILEFN_R2_BUCKET: 'nucleus-files-dev-{region}',
        FILEFN_PROCESSING_DATABASE_URL: secret('postgres://db.example/files?sslmode=require'),
        RESEND_API_KEY: secret('not passed on')
      },
      'euwest'
    );
    expect(env).toEqual({
      FILEFN_R2_ACCOUNT_ID: 'account',
      FILEFN_R2_ACCESS_KEY_ID: 'access',
      FILEFN_R2_SECRET_ACCESS_KEY: 'secret',
      FILEFN_R2_BUCKET: 'nucleus-files-dev-euwest',
      FILEFN_DATABASE_URL: 'postgres://db.example/files?sslmode=require',
      PORT: '8080'
    });
  });

  it('refuses to start the container without storage credentials or the database URL', async () => {
    await expect(
      resolveFileProcessingContainerEnv(
        { ...R2_ENV, FILEFN_R2_SECRET_ACCESS_KEY: { get: async () => null } },
        'insouth'
      )
    ).rejects.toThrow('File processing container needs FILEFN_R2_SECRET_ACCESS_KEY, FILEFN_PROCESSING_DATABASE_URL');
  });
});

describe('scheduled file cleanup', () => {
  it('cleans expired upload sessions and retries owed deletions', async () => {
    const cleanupExpiredSessions = vi.fn(async () => ({ deletedSessions: 2, abortedMultipart: 1 }));
    const retryFileDeletions = vi.fn(async () => ({ deleted: 1, kept: 0, retrying: 0 }));
    const log = logger();

    await runScheduledFileCleanup({ getFileFn: async () => ({ cleanupExpiredSessions }), retryFileDeletions }, log);

    expect(cleanupExpiredSessions).toHaveBeenCalledTimes(1);
    expect(retryFileDeletions).toHaveBeenCalledTimes(1);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('deletes an upload session that expired before completing through the account FileFn', async () => {
    const files = createFilesHarness();
    const uploadSessionId = await files.startUpload('late.png', 'image/png', 10);
    // Upload sessions expire after 24 hours.
    vi.useFakeTimers({ now: Date.now() + 25 * 60 * 60 * 1000, toFake: ['Date'] });
    try {
      await runScheduledFileCleanup(
        { getFileFn: async () => files.fileFn, retryFileDeletions: async () => ({ deleted: 0, kept: 0, retrying: 0 }) },
        logger()
      );
    } finally {
      vi.useRealTimers();
    }
    const remaining = await files.database.findOne({
      model: 'uploadSessions',
      where: [{ field: 'uploadSessionId', operator: 'eq', value: uploadSessionId }],
      namespace: 'filefn'
    });
    expect(remaining).toBeNull();
  });

  it('still retries deletions when the session cleanup fails, then reports the failure', async () => {
    const retryFileDeletions = vi.fn(async () => ({ deleted: 0, kept: 0, retrying: 1 }));
    const log = logger();

    await expect(
      runScheduledFileCleanup(
        { getFileFn: async () => { throw new Error('database down'); }, retryFileDeletions },
        log
      )
    ).rejects.toThrow('Scheduled file cleanup failed');
    expect(retryFileDeletions).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith('nucleus account expired upload cleanup failed', expect.anything());
  });

  it('skips session cleanup when the region has no file storage', async () => {
    const retryFileDeletions = vi.fn(async () => ({ deleted: 0, kept: 0, retrying: 0 }));
    await runScheduledFileCleanup({ getFileFn: async () => null, retryFileDeletions }, logger());
    expect(retryFileDeletions).toHaveBeenCalledTimes(1);
  });
});
