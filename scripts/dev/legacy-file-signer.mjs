#!/usr/bin/env node
/**
 * Local stand-in for the legacy file API's `utils/n/getsignedurl` (GET only).
 *
 * Migrated file records still point at the legacy S3 buckets
 * (`tidyfileslive.<region>`). When a stored signed URL expires the app asks
 * the file API to re-sign it; this serves that request locally by presigning
 * an S3 GetObject URL with a read-only AWS profile. It never writes to AWS:
 * presigning makes no AWS call, and the browser only reads the object.
 *
 * Dev only: binds to 127.0.0.1, signs reads only, only for legacy buckets,
 * and answers CORS for the local app origin. Requests must name this server
 * by its loopback host (so a page that rebinds its own hostname to
 * 127.0.0.1 is refused), come from an allowed origin when they carry one, and
 * send JSON, which browsers can't do across origins without a preflight.
 *
 * Usage:
 *   AWS_PROFILE=data node scripts/dev/legacy-file-signer.mjs [--port 8791]
 *   # then set VITE_FILE_API_URL=http://127.0.0.1:8791 in apps/<app>/.env.local
 */
import http from "node:http";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fromIni } from "@aws-sdk/credential-provider-ini";

const portIndex = process.argv.indexOf("--port");
const port = portIndex > 0 ? Number(process.argv[portIndex + 1]) : 8791;
const profile = process.env.AWS_PROFILE ?? "data";
const allowedOrigins = new Set(
  (process.env.SIGNER_ALLOWED_ORIGINS ?? "https://local.nucleum.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const bucketPattern = /^tidyfileslive\.([a-z]{2}-[a-z]+-\d)$/;
const expiresInSeconds = 6 * 60 * 60;
const clients = new Map();

function clientFor(region) {
  let client = clients.get(region);
  if (!client) {
    client = new S3Client({ region, credentials: fromIni({ profile }) });
    clients.set(region, client);
  }
  return client;
}

/** `bucket/user/dir/file` → { bucket, key, region }, or undefined. */
export function parseLegacyKey(value) {
  if (typeof value !== "string") return undefined;
  const slash = value.indexOf("/");
  if (slash <= 0) return undefined;
  const bucket = value.slice(0, slash);
  const key = value.slice(slash + 1);
  const match = bucketPattern.exec(bucket);
  if (!match || !key || key.includes("..")) return undefined;
  return { bucket, key, region: match[1] };
}

/** The request headers the app sends with a signing request. */
const allowedRequestHeaders = "content-type, authorization";

/**
 * The configured origin equal to `origin`, or undefined. CORS headers carry
 * the configured string, never the request's own value.
 */
function resolveAllowedOrigin(origin) {
  return [...allowedOrigins].find((allowed) => allowed === origin);
}

function send(res, origin, status, body) {
  const headers = { "Content-Type": "application/json" };
  const allowedOrigin = resolveAllowedOrigin(origin);
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Headers"] = allowedRequestHeaders;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Vary"] = "Origin";
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? "" : JSON.stringify(body));
}

const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);

/** Whether a request names this server directly and comes from an allowed page. */
export function isTrustedRequest(headers) {
  if (!allowedHosts.has(String(headers.host ?? "").toLowerCase())) return false;
  const origin = headers.origin;
  return origin === undefined || allowedOrigins.has(origin);
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (!isTrustedRequest(req.headers)) {
    return send(res, undefined, 403, { error: "forbidden" });
  }
  if (req.method === "OPTIONS") {
    return send(res, origin, 204, undefined);
  }
  if (req.method !== "POST" || !req.url?.startsWith("/utils/n/getsignedurl")) {
    return send(res, origin, 404, { error: "not found" });
  }
  if (
    !String(req.headers["content-type"] ?? "").startsWith("application/json")
  ) {
    return send(res, origin, 415, { error: "expected application/json" });
  }
  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 64 * 1024) req.destroy();
  });
  req.on("end", async () => {
    try {
      const body = JSON.parse(raw || "{}");
      if (body.method !== "GET") {
        return send(res, origin, 400, {
          error: "only GET signing is served locally"
        });
      }
      const target = parseLegacyKey(body.key);
      if (!target) return send(res, origin, 400, { error: "unsupported key" });
      const getUrl = await getSignedUrl(
        clientFor(target.region),
        new GetObjectCommand({ Bucket: target.bucket, Key: target.key }),
        { expiresIn: expiresInSeconds }
      );
      send(res, origin, 200, { getUrl });
    } catch (error) {
      console.error("signing failed", error?.name ?? "error");
      send(res, origin, 500, { error: "signing failed" });
    }
  });
});

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  server.listen(port, "127.0.0.1", () => {
    console.log(
      `legacy file signer on http://127.0.0.1:${port} (profile ${profile})`
    );
  });
}
