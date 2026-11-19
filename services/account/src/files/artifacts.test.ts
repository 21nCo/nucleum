import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from '@superfunctions/db/adapters/memory';
import { registerAccountFileRoutes } from './routes.js';
import { createAccountFileFn, type AccountFileAuth } from './server.js';
import { createAccountFileStorage } from './storage.js';

const R2_ENDPOINT = 'https://r2.test';
const ORIGIN = 'http://account.test';
const OWNER = 'user:owner';
const OTHER = 'user:other';
const ACTOR_HEADER = 'x-test-actor';

const HEIC_BYTES = new TextEncoder().encode('heic source bytes');
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

interface StoredObject {
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
}

/**
 * An in-memory R2 bucket answering the S3 API requests the R2 adapter sends
 * and the presigned PUTs that the client and FileFn send to it.
 */
function createR2Bucket() {
  const objects = new Map<string, StoredObject>();
  const uploads = new Map<string, { contentType: string; parts: Map<number, Uint8Array<ArrayBuffer>> }>();
  const etag = (bytes: Uint8Array) => `"${bytes.byteLength}-${randomUUID()}"`;

  async function handle(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== R2_ENDPOINT) {
      throw new Error(`unexpected fetch to ${url.origin}`);
    }
    const key = decodeURIComponent(url.pathname.split('/').slice(2).join('/'));
    const uploadId = url.searchParams.get('uploadId');
    const partNumber = url.searchParams.get('partNumber');
    switch (request.method) {
      case 'PUT': {
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (uploadId && partNumber) {
          uploads.get(uploadId)?.parts.set(Number(partNumber), bytes);
        } else {
          objects.set(key, { bytes, contentType: request.headers.get('content-type') ?? '' });
        }
        return new Response(null, { status: 200, headers: { etag: etag(bytes) } });
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

/**
 * AuthFn stub: a request carrying `x-test-actor` is that user's full-access
 * cookie session, and a request without it carries no session.
 */
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

let bucket: ReturnType<typeof createR2Bucket>;
let app: Hono;

beforeEach(() => {
  bucket = createR2Bucket();
  // FileFn sends its own presigned artifact PUT through the global fetch.
  vi.stubGlobal('fetch', bucket.fetch);
  const storage = createAccountFileStorage(
    {
      FILEFN_R2_ACCOUNT_ID: 'test-account',
      FILEFN_R2_ACCESS_KEY_ID: randomUUID(),
      FILEFN_R2_SECRET_ACCESS_KEY: randomUUID(),
      FILEFN_R2_BUCKET: 'nucleus-files-test-{region}'
    },
    'insouth',
    { endpoint: R2_ENDPOINT, fetch: bucket.fetch }
  );
  const fileFn = createAccountFileFn({
    auth: headerAuth(),
    database: memoryAdapter({ debug: false }),
    storage: storage!
  });
  app = new Hono();
  registerAccountFileRoutes({ app, getFileFn: async () => fileFn });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function call(path: string, actor: string | null, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (actor) headers.set(ACTOR_HEADER, actor);
  return Promise.resolve(app.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers })));
}

async function json<T = any>(response: Response): Promise<T> {
  const body = (await response.json()) as { data?: T };
  return (body.data ?? body) as T;
}

function postJson(path: string, actor: string | null, body: unknown): Promise<Response> {
  return call(path, actor, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/** Uploads a HEIC photo as `OWNER` through the signed-part flow and completes it. */
async function uploadHeic(): Promise<{ fileId: string; versionId: string }> {
  const init = await postJson('/files/upload/init', OWNER, {
    policy: 'nucleus-durable-default',
    fileName: 'photo.heic',
    size: HEIC_BYTES.byteLength,
    mimeType: 'image/heic'
  });
  expect(init.status, 'upload init').toBe(200);
  const { uploadSessionId, totalParts } = await json(init);
  expect(totalParts).toBe(1);

  const signed = await postJson(`/files/upload/${uploadSessionId}/parts/1/sign`, OWNER, {
    contentLength: HEIC_BYTES.byteLength
  });
  expect(signed.status, 'sign part').toBe(200);
  const { url, headers } = await json(signed);
  const put = await bucket.fetch(url, { method: 'PUT', headers, body: HEIC_BYTES });
  expect(put.status, 'part PUT').toBe(200);

  const recorded = await postJson(`/files/upload/${uploadSessionId}/parts/1/complete`, OWNER, {
    etag: put.headers.get('etag'),
    size: HEIC_BYTES.byteLength
  });
  expect(recorded.status, 'complete part').toBe(200);

  const completed = await postJson(`/files/upload/${uploadSessionId}/complete`, OWNER, {});
  expect(completed.status, 'complete upload').toBe(200);
  return json(completed);
}

function putConverted(fileId: string, versionId: string, actor: string | null): Promise<Response> {
  return call(`/files/${fileId}/versions/${versionId}/artifacts/converted`, actor, {
    method: 'PUT',
    headers: { 'content-type': 'image/png', 'content-length': String(PNG_BYTES.byteLength) },
    body: PNG_BYTES
  });
}

async function listArtifacts(fileId: string): Promise<Array<{ artifactId: string; kind: string; source?: string }>> {
  const response = await call(`/files/${fileId}/artifacts`, OWNER);
  expect(response.status, 'list artifacts').toBe(200);
  return (await json<{ artifacts: Array<{ artifactId: string; kind: string; source?: string }> }>(response)).artifacts;
}

describe('account FileFn processing artifacts', () => {
  it('stores the converted artifact of a completed HEIC upload and serves it back to the owner', async () => {
    const { fileId, versionId } = await uploadHeic();

    const stored = await putConverted(fileId, versionId, OWNER);
    expect(stored.status).toBe(200);
    const { artifact } = await json<{ artifact: { artifactId: string; kind: string; source: string } }>(stored);
    expect(artifact).toMatchObject({ kind: 'converted', source: 'client' });

    expect(await listArtifacts(fileId)).toEqual([
      expect.objectContaining({ artifactId: artifact.artifactId, kind: 'converted', source: 'client' })
    ]);
    const download = await call(`/files/proxy/files/${fileId}/artifacts/${artifact.artifactId}/download`, OWNER);
    expect(download.status).toBe(200);
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(PNG_BYTES);
  });

  it('refuses the artifact from a signed-out request and from another user, storing nothing', async () => {
    const { fileId, versionId } = await uploadHeic();
    const objectsBefore = [...bucket.objects.keys()];

    const signedOut = await putConverted(fileId, versionId, null);
    expect(signedOut.status).toBe(401);
    const otherUser = await putConverted(fileId, versionId, OTHER);
    expect(otherUser.status).toBe(403);

    expect(await listArtifacts(fileId)).toEqual([]);
    expect([...bucket.objects.keys()]).toEqual(objectsBefore);
  });
});
