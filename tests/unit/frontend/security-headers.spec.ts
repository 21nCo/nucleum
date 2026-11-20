import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectInlineScriptHashes,
  frameAncestorSources,
  readConfig,
  writeCloudflareAssetHeaders
} from "../../../services/frontend/scripts/frontend-config.mjs";

const serviceRoot = path.resolve(__dirname, "../../../services/frontend");
const config = readConfig(serviceRoot);
const tempRoots: string[] = [];

function makeRepo(indexHtml: string, existingHeaders?: string) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nucleum-headers-test-"));
  tempRoots.push(repoRoot);
  const buildDir = path.join(repoRoot, config.products.nucleum.appPath, "build");
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, "index.html"), indexHtml);
  if (existingHeaders !== undefined)
    fs.writeFileSync(path.join(buildDir, "_headers"), existingHeaders);
  return { repoRoot, buildDir };
}

function sha256(value: string) {
  return `'sha256-${crypto.createHash("sha256").update(value, "utf8").digest("base64")}'`;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("frontend security headers", () => {
  const bootstrap = "\n  __sveltekit_x = { base: '', tag: '</script-widget>' };\n";
  const html = `<!doctype html><html><head><script type="module">${bootstrap}</script ><script src="/_app/a.js"></script><script type="application/json">{"a":1}</script></head><body></body></html>`;

  it("hashes executable inline scripts only", () => {
    const { buildDir } = makeRepo(html);
    expect(collectInlineScriptHashes(buildDir)).toEqual([sha256(bootstrap)]);
  });

  it("writes enforced and report-only policies next to the cache block, idempotently", () => {
    const { repoRoot, buildDir } = makeRepo(html, "/custom\n  X-Test: 1\n");
    const headersPath = writeCloudflareAssetHeaders(repoRoot, config, "nucleum");
    const first = fs.readFileSync(headersPath, "utf8");
    writeCloudflareAssetHeaders(repoRoot, config, "nucleum");
    expect(fs.readFileSync(path.join(buildDir, "_headers"), "utf8")).toBe(first);

    expect(first).toContain("/custom\n  X-Test: 1");
    expect(first).toContain("# BEGIN 21N_FRONTEND_CACHE_HEADERS");
    expect(first).toContain("  X-Content-Type-Options: nosniff");
    expect(first).toContain("  Referrer-Policy: strict-origin-when-cross-origin");
    expect(first).toContain("  Strict-Transport-Security: max-age=31536000");

    const enforced = first.match(/^  Content-Security-Policy: (.*)$/m)?.[1] ?? "";
    expect(enforced).toContain("object-src 'self' blob: https:");
    expect(enforced).not.toMatch(/object-src[^;]*data:/);
    expect(enforced).toContain("base-uri 'self'");
    expect(enforced).toMatch(/frame-ancestors 'self' .*https:\/\/\*\.memotron\.app/);
    expect(enforced).not.toContain("script-src");

    const reportOnly =
      first.match(/^  Content-Security-Policy-Report-Only: (.*)$/m)?.[1] ?? "";
    expect(reportOnly).toContain(`script-src 'self' ${sha256(bootstrap)}`);
    expect(reportOnly).toContain("script-src-attr 'none'");
    expect(reportOnly).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("allows framing only by product domains and environment zones", () => {
    const sources = frameAncestorSources(config);
    expect(sources[0]).toBe("'self'");
    expect(sources).toContain("https://*.nucleum.app");
    expect(sources).toContain("https://*.21n.dev");
    expect(sources).not.toContain("*");
    expect(sources.every((source: string) => source === "'self'" || source.startsWith("https://"))).toBe(true);
  });
});
