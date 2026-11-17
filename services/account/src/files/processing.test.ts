import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { crc32, deflateSync } from 'node:zlib';
import { createNucleumProcessors, detectNucleumCodecs, NUCLEUM_PROCESSOR_NAMES } from '@21n/file-processing';
import { createFileFn, createProcessingJobHandler, type FileFnRuntime, type Processor } from '@filefn/server';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { Hono } from 'hono';
import postgres from 'postgres';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountServices, CreateAccountAppInput } from '../app.js';
import { createFileDeferredWork } from './deferred.js';
import { loadInlineNucleumProcessors } from './inline-processors.js';
import {
  createFileProcessingConsumer,
  createInlineFileProcessing,
  createQueuedFileProcessing,
  FILE_PROCESSING_MAX_RETRIES,
  FILE_PROCESSING_RETRY_DELAY_SECONDS,
  MAX_FILE_PROCESSING_RETRY_DELAY_SECONDS,
  readFileProcessingMode,
  resolveFileProcessingContainerEnv,
  runScheduledFileCleanup,
  type AccountFileProcessing,
  type FileProcessingMode
} from './processing.js';
import { registerAccountFileRoutes } from './routes.js';
import { createAccountFileFn, type AccountFileAuth } from './server.js';
import { createAccountFileStorage } from './storage.js';

const workerHooks = vi.hoisted(() => ({
  inputs: [] as unknown[],
  override: undefined as undefined | ((input: unknown) => unknown)
}));

vi.mock('../app.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app.js')>();
  return {
    ...actual,
    buildAccountServices: vi.fn((input: CreateAccountAppInput) => {
      workerHooks.inputs.push(input);
      return (workerHooks.override?.(input) as AccountServices | undefined) ?? actual.buildAccountServices(input);
    })
  };
});
vi.mock('./processing-container.js', () => ({ FileProcessingContainer: class {} }));

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

/** A 1024x768 solid PNG, encoded here so the account tests need no image library. */
async function pngBytes(): Promise<Uint8Array<ArrayBuffer>> {
  const width = 1024;
  const height = 768;
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) row.set([0x33, 0x66, 0xcc], 1 + x * 3);
  const chunk = (type: string, data: Buffer) => {
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.byteLength);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))),
    chunk('IEND', Buffer.alloc(0))
  ]);
  return new Uint8Array(png);
}

/** A one-page PDF with a line of text. */
function pdfBytes(): Uint8Array<ArrayBuffer> {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length 43 >>\nstream\nBT /F1 24 Tf 72 700 Td (Hello FileFn) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, 'latin1'));
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

  it('remote: leaves out what the prebuilt sharp cannot decode, so a PDF records no placeholder preview', async () => {
    const deferred = createFileDeferredWork();
    const log = logger();
    const prebuilt = { pdf: { input: { buffer: false } }, heif: { input: { buffer: true, fileSuffix: ['.avif'] } } };
    const processors = await loadInlineNucleumProcessors(log, prebuilt);
    expect(processors.map((processor) => processor.name)).toEqual(['thumbnail', 'ocr']);
    expect(processors.find((processor) => processor.name === 'ocr')?.supportedMimeTypes).not.toContain(
      'application/pdf'
    );
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('cannot decode'), {
      unsupported: ['pdf-preview', 'ocr of PDFs', 'heic-convert', 'ocr of HEIC photos']
    });

    const files = createFilesHarness(
      await createInlineFileProcessing({ mode: 'remote', loadProcessors: async () => processors }),
      deferred.runtime
    );
    const { fileId } = await files.upload('report.pdf', 'application/pdf', pdfBytes());
    await deferred.settled();

    expect(await files.artifacts(fileId)).toEqual([]);
  });

  it.skipIf(detectNucleumCodecs().pdf)(
    'remote: a PDF preview the loaded sharp cannot render fails instead of recording a placeholder',
    async () => {
      const deferred = createFileDeferredWork();
      const ocrProvider = { recognize: vi.fn(async () => ({ text: 'recognized', confidence: 90 })) };
      const processing = await createInlineFileProcessing({
        mode: 'remote',
        loadProcessors: async () => createNucleumProcessors({ ocrProvider }) as Processor[]
      });
      const files = createFilesHarness(processing, deferred.runtime);

      const { fileId } = await files.upload('report.pdf', 'application/pdf', pdfBytes());
      await deferred.settled();

      expect((await files.artifacts(fileId)).map((artifact) => artifact.kind)).not.toContain(
        'pdf-preview-page-1-medium'
      );
      expect(ocrProvider.recognize).not.toHaveBeenCalled();
    }
  );
});

describe('processing queue consumer', () => {
  it('forwards a queued upload job to the container, which records the artifacts, and acknowledges it', async () => {
    const queue = createQueue();
    const files = createFilesHarness(createQueuedFileProcessing({ mode: 'remote', queue }));
    const { fileId } = await files.upload('photo.png', 'image/png', await pngBytes());

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
    ['a duplicate outcome', () => Response.json({ outcome: { status: 'duplicate' } }), 'ack', undefined],
    ['a failed outcome', () => Response.json({ outcome: { status: 'failed', errors: ['ocr: boom'] } }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    ['a retry outcome', () => Response.json({ outcome: { status: 'retry' } }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    ['an unreadable 200 body', () => new Response('not json', { status: 200 }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    ['400 (malformed job)', () => new Response('{}', { status: 400 }), 'ack', undefined],
    ['413 (job too large)', () => new Response('{}', { status: 413 }), 'ack', undefined],
    ['503 with Retry-After', () => new Response('{}', { status: 503, headers: { 'retry-after': '120' } }), 'retry', 120],
    ['503 without Retry-After', () => new Response('{}', { status: 503 }), 'retry', FILE_PROCESSING_RETRY_DELAY_SECONDS],
    [
      '503 with a Retry-After over the Queues limit',
      () => new Response('{}', { status: 503, headers: { 'retry-after': '86400' } }),
      'retry',
      MAX_FILE_PROCESSING_RETRY_DELAY_SECONDS
    ],
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

  it('dead-letters a job whose processor fails on the last delivery, with its errors logged', async () => {
    const queue = createQueue();
    const files = createFilesHarness(createQueuedFileProcessing({ mode: 'remote', queue }));
    await files.upload('photo.png', 'image/png', await pngBytes());
    const containerFileFn = createFileFn({
      database: files.database,
      storage: files.storage,
      namespace: 'filefn',
      processing: {
        enabled: true,
        processors: createNucleumProcessors({
          ocrProvider: {
            recognize: async () => {
              throw new Error('ocr engine down');
            }
          }
        }) as Processor[]
      }
    });
    const handler = createProcessingJobHandler(containerFileFn, { maxRetries: FILE_PROCESSING_MAX_RETRIES });
    const container = {
      fetch: async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { job: unknown; attempts: number };
        return Response.json({ outcome: await handler.handle(body.job, { attempts: body.attempts }) });
      }
    };
    const log = logger();
    const consumer = createFileProcessingConsumer({ container: () => container, logger: log });

    const deliveries = Array.from({ length: FILE_PROCESSING_MAX_RETRIES + 1 }, (_, index) =>
      message(queue.sent[0], index + 1)
    );
    for (const delivered of deliveries) await consumer.queue({ messages: [delivered] });

    for (const delivered of deliveries) {
      expect(delivered.ack).not.toHaveBeenCalled();
      expect(delivered.retry).toHaveBeenCalledWith({ delaySeconds: FILE_PROCESSING_RETRY_DELAY_SECONDS });
    }
    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(
      'nucleus file processing job failed',
      expect.objectContaining({
        attempts: FILE_PROCESSING_MAX_RETRIES + 1,
        errors: [expect.stringContaining('ocr engine down')]
      })
    );
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
        FILEFN_PROCESSING_DATABASE_URL: secret('postgres://db.example/files?sslmode=verify-full'),
        RESEND_API_KEY: secret('not passed on')
      },
      'euwest'
    );
    expect(env).toEqual({
      FILEFN_R2_ACCOUNT_ID: 'account',
      FILEFN_R2_ACCESS_KEY_ID: 'access',
      FILEFN_R2_SECRET_ACCESS_KEY: 'secret',
      FILEFN_R2_BUCKET: 'nucleus-files-dev-euwest',
      FILEFN_DATABASE_URL: 'postgres://db.example/files?sslmode=verify-full',
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

  it.each([
    ['plaintext', 'postgres://db.example/files'],
    ['sslmode=require (no certificate check)', 'postgres://db.example/files?sslmode=require'],
    ['sslrootcert=SYSTEM (plaintext in postgres.js)', 'postgres://db.example/files?sslrootcert=SYSTEM'],
    [
      'sslrootcert=SYSTEM with sslmode=require (no certificate check)',
      'postgres://db.example/files?sslrootcert=SYSTEM&sslmode=require'
    ],
    ['a non-exact sslmode spelling', 'postgres://db.example/files?sslmode=VERIFY-FULL']
  ])('refuses to start the container with a remote database URL over %s', async (_label, url) => {
    await expect(
      resolveFileProcessingContainerEnv({ ...R2_ENV, FILEFN_PROCESSING_DATABASE_URL: url }, 'insouth')
    ).rejects.toThrow(/sslmode=verify-full, ssl=verify-full or sslrootcert=system/);
  });

  it.each([
    'postgres://db.example/files?sslmode=verify-full',
    'postgres://db.example/files?sslrootcert=system',
    'postgres://db.example/files?sslrootcert=system&sslmode=require',
    'postgres://localhost:5432/files'
  ])('passes on the verified or loopback database URL %s', async (url) => {
    const env = await resolveFileProcessingContainerEnv({ ...R2_ENV, FILEFN_PROCESSING_DATABASE_URL: url }, 'insouth');
    expect(env.FILEFN_DATABASE_URL).toBe(url);
  });

  it.each([
    'postgres://db.example/files?sslmode=verify-full',
    'postgres://db.example/files?sslrootcert=system',
    'postgres://db.example/files?sslrootcert=system&sslmode=require'
  ])('accepts the remote URL %s only because postgres.js verifies its certificate', async (url) => {
    await resolveFileProcessingContainerEnv({ ...R2_ENV, FILEFN_PROCESSING_DATABASE_URL: url }, 'insouth');
    const sql = postgres(url);
    expect(sql.options.ssl).toBe('verify-full');
    await sql.end();
  });

  it.each(DRIVER_PARITY_URLS)(
    'decides %s on the hosts and TLS mode the container\'s postgres.js parses (accepted: %s)',
    async (url, accepted) => {
      expect(await containerDriverVerifies(url)).toBe(accepted);
      const resolved = resolveFileProcessingContainerEnv({ ...R2_ENV, FILEFN_PROCESSING_DATABASE_URL: url }, 'insouth');
      if (accepted) {
        expect((await resolved).FILEFN_DATABASE_URL).toBe(url);
      } else {
        await expect(resolved).rejects.toThrow(/FILEFN_CONTAINER_CONFIG_INVALID/);
      }
    }
  );
});

/**
 * [url, accepted]: accepted exactly when postgres.js uses ssl=verify-full or
 * connects only to loopback. postgres.js takes the host list after the FIRST
 * `@`, where WHATWG URL splits userinfo at the last.
 */
const DRIVER_PARITY_URLS: Array<[string, boolean]> = [
  ['postgres://u:p@db.example/files', false],
  ['postgres://u:p@db.example/files?sslmode=verify-full', true],
  ['postgres://u:p@db.example/files?ssl=verify-full', true],
  ['postgres://u:p@db.example/files?sslrootcert=SYSTEM', false],
  ['postgres://u:p@localhost:5432/files', true],
  ['postgres://u:p@LOCALHOST/files', false],
  ['postgres://u:p@127.0.0.1/files', true],
  ['postgres://u@[::1]:5432/files', false],
  ['postgres://a@evil.example,b@localhost/db', false],
  ['postgres://u:p@ss,w@localhost/db', false],
  ['postgres://a@evil.example,b@localhost/db?sslrootcert=system', true],
  ['postgres://u:p%40x@db.example/files', false],
  ['postgres://u:p%40x@localhost/files', true],
  ['postgres://u@localhost%2Cevil.example/files', false],
  ['postgres://u@localhost,127.0.0.1:5433/files', true],
  ['postgres://u@LOCALHOST,localhost/files', false],
  ['postgres://u@localhost,db.example/files', false],
  ['postgres://u@localhost,db.example/files?sslmode=verify-full', true],
  ['postgres://u@db.example,localhost/files?sslmode=require', false]
];

/** The independent oracle: what the container's own postgres.js parses from `url`. */
async function containerDriverVerifies(url: string): Promise<boolean> {
  const containerPostgres = createRequire(new URL('../../../file-processing/package.json', import.meta.url))(
    'postgres'
  ) as (url: string) => { options: { ssl: unknown; host: string[] }; end: () => Promise<void> };
  let sql;
  try {
    sql = containerPostgres(url);
  } catch {
    return false;
  }
  const { ssl, host } = sql.options;
  await sql.end();
  return ssl === 'verify-full' || host.every((entry) => entry === 'localhost' || entry === '127.0.0.1');
}

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

describe('account Worker entry', () => {
  const processEnv = { ...process.env };
  const ctx = () => ({ waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} }) as unknown as ExecutionContext;
  const workerEnv = (env: Record<string, unknown>) => ({
    DATABASE_URL: 'postgres://localhost:5432/account',
    ...R2_ENV,
    ...env
  });

  let worker: typeof import('../worker.js').default;

  beforeAll(async () => {
    worker = (await import('../worker.js')).default;
  }, 60_000);

  beforeEach(() => {
    workerHooks.inputs.length = 0;
    workerHooks.override = undefined;
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) if (!(key in processEnv)) delete process.env[key];
    Object.assign(process.env, processEnv);
  });

  it('remote: a request scope enqueues completed uploads on the FILEFN_PROCESSING_QUEUE binding', async () => {
    const queue = createQueue();
    await worker.fetch(
      new Request(`${ORIGIN}/__not-a-route`),
      workerEnv({ FILEFN_PROCESSING_MODE: 'remote', FILEFN_PROCESSING_QUEUE: queue }),
      ctx()
    );

    expect(workerHooks.inputs).toHaveLength(1);
    const [input] = workerHooks.inputs as CreateAccountAppInput[];
    const processing = await input!.infra.files!.processing!();
    const files = createFilesHarness(processing);
    const { fileId } = await files.upload('photo.png', 'image/png', await pngBytes());

    expect(queue.send).toHaveBeenCalledTimes(1);
    expect(queue.sent[0]).toMatchObject({ fileId, mimeType: 'image/png' });
  });

  it('local: a request scope has no server processing', async () => {
    await worker.fetch(new Request(`${ORIGIN}/__not-a-route`), workerEnv({ FILEFN_PROCESSING_MODE: 'local' }), ctx());

    expect(workerHooks.inputs).toHaveLength(1);
    const [input] = workerHooks.inputs as CreateAccountAppInput[];
    expect(await input!.infra.files!.processing!()).toBeUndefined();
  });

  it('queue() forwards each job to the region container named by the binding and acknowledges it', async () => {
    const stub = { fetch: vi.fn(async () => Response.json({ outcome: { status: 'completed', artifactsCreated: 1 } })) };
    const containers = { idFromName: vi.fn((name: string) => `id:${name}`), get: vi.fn(() => stub) };
    const delivered = message({ fileId: 'f', versionId: 'v', idempotencyKey: 'k' });

    await worker.queue(
      { messages: [delivered] } as unknown as MessageBatch,
      workerEnv({ FILEFN_PROCESSING_MODE: 'remote', FILEFN_PROCESSING_CONTAINER: containers })
    );

    expect(containers.idFromName).toHaveBeenCalledWith('file-processing');
    expect(containers.get).toHaveBeenCalledWith('id:file-processing');
    expect(stub.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/jobs$/), expect.objectContaining({ method: 'POST' }));
    expect(delivered.ack).toHaveBeenCalledTimes(1);
  });

  it('queue() refuses jobs without the FILEFN_PROCESSING_CONTAINER binding', async () => {
    const delivered = message({ fileId: 'f', versionId: 'v', idempotencyKey: 'k' });
    await expect(
      worker.queue({ messages: [delivered] } as unknown as MessageBatch, workerEnv({ FILEFN_PROCESSING_MODE: 'remote' }))
    ).rejects.toThrow(/FILEFN_PROCESSING_CONTAINER/);
    expect(delivered.ack).not.toHaveBeenCalled();
  });

  it('scheduled() runs session cleanup and deletion retries in local mode, then closes the scope', async () => {
    const cleanupExpiredSessions = vi.fn(async () => ({ deletedSessions: 1, abortedMultipart: 1 }));
    const retryFileDeletions = vi.fn(async () => ({ deleted: 0, kept: 0, retrying: 0 }));
    const close = vi.fn(async () => {});
    workerHooks.override = () => ({ getFileFn: async () => ({ cleanupExpiredSessions }), retryFileDeletions, close });

    await worker.scheduled({} as ScheduledController, workerEnv({ FILEFN_PROCESSING_MODE: 'local' }), ctx());

    expect(cleanupExpiredSessions).toHaveBeenCalledTimes(1);
    expect(retryFileDeletions).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
