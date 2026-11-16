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
 * and answers CORS for the local app origin.
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

function send(res, origin, status, body, requestedHeaders) {
  const headers = { "Content-Type": "application/json" };
  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] =
      requestedHeaders || "content-type, authorization";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Vary"] = "Origin";
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? "" : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (req.method === "OPTIONS") {
    return send(res, origin, 204, undefined, req.headers["access-control-request-headers"]);
  }
  if (req.method !== "POST" || !req.url?.startsWith("/utils/n/getsignedurl")) {
    return send(res, origin, 404, { error: "not found" });
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
        return send(res, origin, 400, { error: "only GET signing is served locally" });
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
      send(res, origin, 500, { error: String(error?.message ?? error) });
    }
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`legacy file signer on http://127.0.0.1:${port} (profile ${profile})`);
});
