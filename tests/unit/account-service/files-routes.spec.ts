import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryRuntimeStores,
  memoryAdapter
} from "@superfunctions/db/adapters/memory";
import type { Adapter } from "@superfunctions/db";
import {
  buildAccountServices,
  registerCoreRoutes,
  type AccountServices
} from "../../../services/account/src/app";
import { createAccountFileStorage } from "../../../services/account/src/files/storage";
import { createCapturedLogger } from "../../../services/account/src/testing/logger";
import { createInMemoryRegionLookupStore } from "../../../services/account/src/testing/memory-lookup";
import { createCapturingDeliveryProvider } from "../../../services/account/src/testing/outbox";

const AUTHORITY = "http://account.test";
const PRODUCT_ORIGIN = "https://local.nucleum.app";
const R2_ENDPOINT = "https://r2.test";
const R2_ENV = {
  FILEFN_R2_ACCOUNT_ID: "test-account",
  FILEFN_R2_ACCESS_KEY_ID: "test-access-key",
  FILEFN_R2_SECRET_ACCESS_KEY: "test-secret-key",
  FILEFN_R2_BUCKET: "nucleus-files-test-{region}"
};
const PASSWORD = "CorrectHorseBatteryStaple1!";

interface StoredObject {
  body: Uint8Array;
  contentType?: string;
}

/** In-memory R2 S3 API covering the calls the R2 adapter makes for FileFn. */
function createFakeR2() {
  const objects = new Map<string, StoredObject>();
  const uploads = new Map<string, { key: string; contentType?: string; parts: Map<number, Uint8Array> }>();
  const buckets = new Set<string>();
  let uploadCounter = 0;

  async function fetch(input: string, init: RequestInit = {}): Promise<Response> {
    const url = new URL(input);
    const [bucket, ...keySegments] = url.pathname.slice(1).split("/");
    const key = keySegments.map(decodeURIComponent).join("/");
    const objectId = `${bucket}/${key}`;
    const method = (init.method ?? "GET").toUpperCase();
    buckets.add(bucket);
    const headers = new Headers(init.headers);

    if (method === "POST" && url.searchParams.has("uploads")) {
      const uploadId = `upload-${++uploadCounter}`;
      uploads.set(uploadId, {
        key: objectId,
        contentType: headers.get("content-type") ?? undefined,
        parts: new Map()
      });
      return xml(
        `<InitiateMultipartUploadResult><Bucket>${bucket}</Bucket><Key>${key}</Key><UploadId>${uploadId}</UploadId></InitiateMultipartUploadResult>`
      );
    }
    const uploadId = url.searchParams.get("uploadId");
    if (method === "PUT" && uploadId) {
      const upload = uploads.get(uploadId);
      if (!upload) return new Response(null, { status: 404 });
      const partNumber = Number(url.searchParams.get("partNumber"));
      upload.parts.set(partNumber, new Uint8Array(await new Response(init.body).arrayBuffer()));
      return new Response(null, { status: 200, headers: { etag: `"part-${partNumber}"` } });
    }
    if (method === "POST" && uploadId) {
      const upload = uploads.get(uploadId);
      if (!upload) return new Response(null, { status: 404 });
      const ordered = [...upload.parts.entries()].sort(([a], [b]) => a - b).map(([, bytes]) => bytes);
      const total = ordered.reduce((sum, bytes) => sum + bytes.length, 0);
      const body = new Uint8Array(total);
      let offset = 0;
      for (const bytes of ordered) {
        body.set(bytes, offset);
        offset += bytes.length;
      }
      objects.set(upload.key, { body, contentType: upload.contentType });
      uploads.delete(uploadId);
      return xml(
        `<CompleteMultipartUploadResult><Bucket>${bucket}</Bucket><Key>${key}</Key><ETag>"complete"</ETag></CompleteMultipartUploadResult>`
      );
    }
    if (method === "DELETE" && uploadId) {
      uploads.delete(uploadId);
      return new Response(null, { status: 204 });
    }
    const stored = objects.get(objectId);
    if (method === "DELETE") {
      objects.delete(objectId);
      return new Response(null, { status: 204 });
    }
    if (!stored) {
      return new Response(method === "HEAD" ? null : "<Error><Code>NoSuchKey</Code></Error>", {
        status: 404
      });
    }
    const objectHeaders = {
      "content-length": String(stored.body.length),
      "content-type": stored.contentType ?? "application/octet-stream",
      etag: '"complete"',
      "last-modified": new Date(0).toUTCString()
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers: objectHeaders });
    if (method === "GET") return new Response(stored.body, { status: 200, headers: objectHeaders });
    return new Response(null, { status: 405 });
  }

  return { fetch, objects, buckets };
}

function xml(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    status: 200,
    headers: { "content-type": "application/xml" }
  });
}

interface TestApp {
  app: Hono;
  services: AccountServices;
  authDatabase: Adapter;
  r2: ReturnType<typeof createFakeR2>;
  logs: ReturnType<typeof createCapturedLogger>;
}

function createTestApp(
  input: { regionId?: string; r2Env?: Record<string, string | undefined> } = {}
): TestApp {
  const regionId = input.regionId ?? "insouth";
  const r2 = createFakeR2();
  const authDatabase = memoryAdapter({ debug: false });
  const logs = createCapturedLogger("filefn-routes-test");
  const services = buildAccountServices({
    infra: {
      database: authDatabase,
      syncDatabase: memoryAdapter({ debug: false }),
      stores: createMemoryRuntimeStores(),
      logger: logs.logger,
      files: {
        database: memoryAdapter({ debug: false }),
        storage: (resolvedRegionId) =>
          createAccountFileStorage(input.r2Env ?? R2_ENV, resolvedRegionId, {
            endpoint: R2_ENDPOINT,
            fetch: r2.fetch
          })
      }
    },
    deployment: {
      regionId,
      regions: [
        { regionId, authority: AUTHORITY, hosts: [new URL(AUTHORITY).hostname] }
      ],
      regionLookupStore: createInMemoryRegionLookupStore(),
      corsOrigins: [PRODUCT_ORIGIN]
    },
    integrations: {
      delivery: createCapturingDeliveryProvider(),
      authRateLimit: false,
      syncRateLimit: false
    }
  });
  const app = new Hono();
  registerCoreRoutes(app, services);
  return { app, services, authDatabase, r2, logs };
}

interface BearerUser {
  actorId: string;
  headers: Record<string, string>;
}

let emailCounter = 0;

async function signUpBearer(app: Hono): Promise<BearerUser> {
  const response = await app.request(`${AUTHORITY}/auth/sign-up/password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `files-${Date.now()}-${++emailCounter}@example.com`,
      password: PASSWORD,
      sessionMode: "bearer"
    })
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  return {
    actorId: body.data.session.actorId,
    headers: { authorization: `Bearer ${body.data.token}` }
  };
}

async function request(
  app: Hono,
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
): Promise<{ status: number; body: any; response: Response }> {
  const response = await app.request(`${AUTHORITY}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      ...init.headers
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  });
  const text = await response.clone().text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, response };
}

const fileBytes = new TextEncoder().encode("hello from filefn");

async function uploadFile(
  testApp: TestApp,
  user: BearerUser,
  options: { fileId?: string; fileName?: string; mimeType?: string; bytes?: Uint8Array } = {}
): Promise<{ fileId: string; versionId: string }> {
  const bytes = options.bytes ?? fileBytes;
  const init = await request(testApp.app, "/files/upload/init", {
    method: "POST",
    headers: user.headers,
    body: {
      policy: "nucleus-durable-default",
      fileName: options.fileName ?? "note.txt",
      mimeType: options.mimeType ?? "text/plain",
      size: bytes.length,
      ...(options.fileId ? { fileId: options.fileId } : {})
    }
  });
  expect(init.status).toBe(200);
  const { uploadSessionId, totalParts } = init.body.data;
  expect(totalParts).toBe(1);

  const sign = await request(testApp.app, `/files/upload/${uploadSessionId}/parts/1/sign`, {
    method: "POST",
    headers: user.headers,
    body: { contentLength: bytes.length }
  });
  expect(sign.status).toBe(200);
  const put = await testApp.r2.fetch(sign.body.data.url, {
    method: "PUT",
    headers: sign.body.data.headers,
    body: bytes
  });
  expect(put.status).toBe(200);

  const partComplete = await request(
    testApp.app,
    `/files/upload/${uploadSessionId}/parts/1/complete`,
    {
      method: "POST",
      headers: user.headers,
      body: { etag: put.headers.get("etag"), size: bytes.length }
    }
  );
  expect(partComplete.status).toBe(200);

  const complete = await request(testApp.app, `/files/upload/${uploadSessionId}/complete`, {
    method: "POST",
    headers: user.headers
  });
  expect(complete.status).toBe(200);
  return {
    fileId: complete.body.data.fileId,
    versionId: complete.body.data.versionId
  };
}

describe("account service /files", () => {
  let testApp: TestApp;

  beforeEach(() => {
    testApp = createTestApp();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 401 without a session", async () => {
    const list = await request(testApp.app, "/files");
    expect(list.status).toBe(401);
    expect(list.body.error.code).toBe("FILEFN_AUTH_REQUIRED");

    const init = await request(testApp.app, "/files/upload/init", {
      method: "POST",
      body: {
        policy: "nucleus-durable-default",
        fileName: "note.txt",
        mimeType: "text/plain",
        size: 5
      }
    });
    expect(init.status).toBe(401);
    expect(testApp.r2.buckets.size).toBe(0);
  });

  it("returns 401 for a forged session cookie and a forged bearer token", async () => {
    const { sessionCookieName } = await testApp.services.auth.cookieNamesForRequest(
      new Request(`${AUTHORITY}/files`)
    );
    const forgedCookie = await request(testApp.app, "/files", {
      headers: { cookie: `${sessionCookieName}=forged-session-token` }
    });
    expect(forgedCookie.status).toBe(401);

    const forgedBearer = await request(testApp.app, "/files", {
      headers: { authorization: "Bearer forged-session-token" }
    });
    expect(forgedBearer.status).toBe(401);
  });

  it("returns 401 once the session has expired", async () => {
    const user = await signUpBearer(testApp.app);
    expect((await request(testApp.app, "/files", { headers: user.headers })).status).toBe(200);

    const sessions = await testApp.authDatabase.findMany({
      model: "sessions",
      where: [{ field: "userId", operator: "eq", value: user.actorId }],
      namespace: "nucleus_account"
    });
    expect(sessions.length).toBeGreaterThan(0);
    for (const session of sessions as Array<{ id: string }>) {
      await testApp.authDatabase.update({
        model: "sessions",
        where: [{ field: "id", operator: "eq", value: session.id }],
        data: { expiresAt: new Date(Date.now() - 60_000) },
        namespace: "nucleus_account"
      });
    }

    const expired = await request(testApp.app, "/files", { headers: user.headers });
    expect(expired.status).toBe(401);
  });

  it("lets a principal write and read its own file in the region's R2 bucket", async () => {
    const owner = await signUpBearer(testApp.app);
    const { fileId, versionId } = await uploadFile(testApp, owner);

    expect([...testApp.r2.buckets]).toEqual(["nucleus-files-test-insouth"]);
    const stored = [...testApp.r2.objects.entries()];
    expect(stored).toHaveLength(1);
    expect(stored[0][0].startsWith("nucleus-files-test-insouth/")).toBe(true);
    expect(new TextDecoder().decode(stored[0][1].body)).toBe("hello from filefn");

    const metadata = await request(testApp.app, `/files/${fileId}`, { headers: owner.headers });
    expect(metadata.status).toBe(200);
    expect(metadata.body.data).toMatchObject({
      fileId,
      currentVersionId: versionId,
      ownerId: owner.actorId,
      name: "note.txt",
      mimeType: "text/plain",
      size: fileBytes.length
    });

    const list = await request(testApp.app, "/files", { headers: owner.headers });
    expect(list.status).toBe(200);
    expect(list.body.data.files.map((item: { fileId: string }) => item.fileId)).toEqual([fileId]);

    const proxied = await testApp.app.request(
      `${AUTHORITY}/files/proxy/files/${fileId}/download`,
      { headers: owner.headers }
    );
    expect(proxied.status).toBe(200);
    expect(await proxied.text()).toBe("hello from filefn");

    const download = await request(testApp.app, `/files/${fileId}/download`, {
      headers: owner.headers
    });
    expect(download.status).toBe(200);
    expect(new URL(download.body.data.url).pathname.startsWith("/nucleus-files-test-insouth/")).toBe(true);

    const deleted = await request(testApp.app, `/files/${fileId}`, {
      method: "DELETE",
      headers: owner.headers
    });
    expect(deleted.status).toBe(200);
  });

  it("returns 403 when a principal reads, replaces or deletes another user's file", async () => {
    const owner = await signUpBearer(testApp.app);
    const other = await signUpBearer(testApp.app);
    const { fileId } = await uploadFile(testApp, owner);

    for (const path of [
      `/files/${fileId}`,
      `/files/${fileId}/download`,
      `/files/${fileId}/versions`,
      `/files/proxy/files/${fileId}/download`
    ]) {
      const read = await request(testApp.app, path, { headers: other.headers });
      expect(read.status, path).toBe(403);
      expect(read.body.error.code, path).toBe("FILEFN_FORBIDDEN");
    }

    const list = await request(testApp.app, "/files", { headers: other.headers });
    expect(list.status).toBe(200);
    expect(list.body.data.files).toEqual([]);

    const replace = await request(testApp.app, "/files/upload/init", {
      method: "POST",
      headers: other.headers,
      body: {
        policy: "nucleus-durable-default",
        fileName: "note.txt",
        mimeType: "text/plain",
        size: fileBytes.length,
        fileId
      }
    });
    expect(replace.status).toBe(403);

    const deleted = await request(testApp.app, `/files/${fileId}`, {
      method: "DELETE",
      headers: other.headers
    });
    expect(deleted.status).toBe(403);

    const stillThere = await request(testApp.app, `/files/${fileId}`, { headers: owner.headers });
    expect(stillThere.status).toBe(200);
  });

  it("requires the CSRF token for cookie-session writes", async () => {
    const signup = await testApp.app.request(`${AUTHORITY}/auth/sign-up/password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `files-cookie-${Date.now()}@example.com`,
        password: PASSWORD
      })
    });
    expect(signup.status).toBe(200);
    const setCookies = signup.headers.getSetCookie();
    const cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
    const { csrfCookieName } = await testApp.services.auth.cookieNamesForRequest(
      new Request(`${AUTHORITY}/files`)
    );
    const csrfToken = setCookies
      .map((value) => value.split(";")[0])
      .find((value) => value.startsWith(`${csrfCookieName}=`))
      ?.slice(csrfCookieName.length + 1);
    expect(csrfToken).toBeTruthy();

    const read = await request(testApp.app, "/files", { headers: { cookie } });
    expect(read.status).toBe(200);

    const body = {
      policy: "nucleus-durable-default",
      fileName: "note.txt",
      mimeType: "text/plain",
      size: 5
    };
    const withoutCsrf = await request(testApp.app, "/files/upload/init", {
      method: "POST",
      headers: { cookie },
      body
    });
    expect(withoutCsrf.status).toBe(403);
    expect(withoutCsrf.body.error.code).toBe("FILEFN_FORBIDDEN");

    const withCsrf = await request(testApp.app, "/files/upload/init", {
      method: "POST",
      headers: { cookie, "x-authfn-csrf": csrfToken! },
      body
    });
    expect(withCsrf.status).toBe(200);
  });

  it("applies the Nucleus 100 MB cap and allowed types", async () => {
    const user = await signUpBearer(testApp.app);
    const init = (body: Record<string, unknown>) =>
      request(testApp.app, "/files/upload/init", {
        method: "POST",
        headers: user.headers,
        body: { policy: "nucleus-durable-default", fileName: "file", ...body }
      });

    const atCap = await init({ mimeType: "video/mp4", size: 100 * 1024 * 1024 });
    expect(atCap.status).toBe(200);

    const overCap = await init({ mimeType: "video/mp4", size: 100 * 1024 * 1024 + 1 });
    expect(overCap.body.error.code).toBe("FILEFN_POLICY_MAX_SIZE_EXCEEDED");

    const disallowed = await init({ mimeType: "application/x-msdownload", size: 10 });
    expect(disallowed.body.error.code).toBe("FILEFN_POLICY_CONTENT_TYPE_NOT_ALLOWED");

    const policies = await request(testApp.app, "/files/policies", { headers: user.headers });
    expect(policies.status).toBe(200);
    expect(JSON.stringify(policies.body.data)).toContain("nucleus-durable-default");
  });

  it("allows FileFn preflights from product origins only", async () => {
    const preflight = (origin: string) =>
      testApp.app.request(`${AUTHORITY}/files/upload/init`, {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers":
            "content-type,x-authfn-csrf,x-idempotency-key,x-upload-session-token,x-filefn-client-version"
        }
      });

    const allowed = await preflight(PRODUCT_ORIGIN);
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(PRODUCT_ORIGIN);
    expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");
    const allowHeaders = allowed.headers.get("access-control-allow-headers") ?? "";
    for (const header of ["x-idempotency-key", "x-upload-session-token", "x-filefn-client-version"]) {
      expect(allowHeaders).toContain(header);
    }

    const foreign = await preflight("https://evil.example");
    expect(foreign.status).toBe(403);
    expect(foreign.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("uses the bucket of the service's region", async () => {
    const euwest = createTestApp({ regionId: "euwest" });
    const owner = await signUpBearer(euwest.app);
    await uploadFile(euwest, owner);
    expect([...euwest.r2.buckets]).toEqual(["nucleus-files-test-euwest"]);
  });

  it("answers 503 on /files only when R2 is not configured", async () => {
    const unconfigured = createTestApp({
      r2Env: { ...R2_ENV, FILEFN_R2_SECRET_ACCESS_KEY: undefined }
    });
    const user = await signUpBearer(unconfigured.app);
    const files = await request(unconfigured.app, "/files", { headers: user.headers });
    expect(files.status).toBe(503);
    expect(files.body.error.code).toBe("FILEFN_UNAVAILABLE");

    const health = await request(unconfigured.app, "/health");
    expect(health.status).toBe(200);
  });

  it("serves uploaded SVG bytes as sandboxed attachments on every proxy download", async () => {
    const owner = await signUpBearer(testApp.app);
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>'
    );
    const { fileId, versionId } = await uploadFile(testApp, owner, {
      fileName: "image.svg",
      mimeType: "image/svg+xml",
      bytes: svg
    });

    const share = await request(testApp.app, `/files/${fileId}/share-links`, {
      method: "POST",
      headers: owner.headers,
      body: {}
    });
    expect(share.status).toBe(201);
    const token = share.body.data.token;
    expect(typeof token).toBe("string");

    const downloads: Array<[string, Record<string, string>]> = [
      [`/files/proxy/files/${fileId}/download`, owner.headers],
      [`/files/proxy/files/${fileId}/versions/${versionId}/download`, owner.headers],
      [`/files/proxy/share-links/${token}/download`, {}]
    ];
    for (const [path, headers] of downloads) {
      const response = await testApp.app.request(`${AUTHORITY}${path}`, { headers });
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toBe("image/svg+xml");
      expect(response.headers.get("x-content-type-options"), path).toBe("nosniff");
      expect(response.headers.get("content-security-policy"), path).toBe(
        "sandbox; default-src 'none'"
      );
      expect(response.headers.get("content-disposition"), path).toBe("attachment");
      expect(new Uint8Array(await response.arrayBuffer()), path).toEqual(svg);
    }

    const metadata = await request(testApp.app, `/files/${fileId}`, { headers: owner.headers });
    expect(metadata.status).toBe(200);
    expect(metadata.response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(metadata.response.headers.get("content-disposition")).toBeNull();
  });

  it("keeps share tokens out of request logs and debug-sink payloads", async () => {
    const sinkBodies: string[] = [];
    vi.stubEnv("DEBUG_SINK_URL", "https://debug-sink.test");
    vi.stubEnv("ACCOUNT_LATENCY_DEBUG", "true");
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      sinkBodies.push(String(init?.body ?? ""));
      expect(String(input)).toBe("https://debug-sink.test/v1/logs");
      return new Response(null, { status: 204 });
    });

    const owner = await signUpBearer(testApp.app);
    const { fileId } = await uploadFile(testApp, owner);
    const share = await request(testApp.app, `/files/${fileId}/share-links`, {
      method: "POST",
      headers: owner.headers,
      body: {}
    });
    expect(share.status).toBe(201);
    const token: string = share.body.data.token;
    testApp.logs.clear();
    sinkBodies.length = 0;

    const sharePaths = [
      `/files/share-links/${token}/download`,
      `/files/proxy/share-links/${token}/download`
    ];
    for (const path of sharePaths) {
      expect((await request(testApp.app, path)).status, path).toBe(200);
    }
    const revoke = await request(testApp.app, `/files/${fileId}/share-links/${token}`, {
      method: "DELETE",
      headers: owner.headers
    });
    expect(revoke.status).toBe(200);
    for (const path of sharePaths) {
      const revoked = await request(testApp.app, path);
      expect(revoked.status, path).toBeGreaterThanOrEqual(400);
      expect(revoked.status, path).toBeLessThan(500);
    }

    const loggedPaths = testApp.logs
      .events()
      .filter((event) => event.msg === "account request")
      .map((event) => event.ctx?.path);
    expect(loggedPaths).toEqual(
      expect.arrayContaining([
        "/files/share-links/:token/download",
        "/files/proxy/share-links/:token/download",
        `/files/${fileId}/share-links/:token`
      ])
    );
    expect(sinkBodies.length).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(testApp.logs.events())).not.toContain(token);
    for (const body of sinkBodies) {
      expect(body).not.toContain(token);
    }
  });

  it("returns 404 for paths FileFn does not serve and leaves other prefixes alone", async () => {
    const user = await signUpBearer(testApp.app);
    const unknown = await request(testApp.app, "/files/a/b/c/d", { headers: user.headers });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("FILEFN_ROUTE_NOT_FOUND");

    const sibling = await request(testApp.app, "/filesystem", { headers: user.headers });
    expect(sibling.status).toBe(404);
    expect(sibling.body?.error?.code).not.toBe("FILEFN_AUTH_REQUIRED");
  });
});
