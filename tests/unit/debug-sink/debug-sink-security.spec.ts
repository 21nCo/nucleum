import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasToken, type Env } from "../../../services/debug-sink/src/index";
import { renderConfig } from "../../../services/account/scripts/wrangler-config.mjs";

const env = {} as Env;
const token = "test-debug-sink-token";

describe("debug sink token check", () => {
  it("accepts the token from the header or bearer authorization", () => {
    expect(hasToken(new Request("https://sink.test/v1/logs", { headers: { "x-debug-sink-token": token } }), token, env)).toBe(true);
    expect(hasToken(new Request("https://sink.test/v1/logs", { headers: { authorization: `Bearer ${token}` } }), token, env)).toBe(true);
  });

  it("refuses a token in the query string and wrong or prefixed tokens", () => {
    expect(hasToken(new Request(`https://sink.test/v1/logs?token=${token}`), token, env)).toBe(false);
    expect(hasToken(new Request("https://sink.test/v1/logs", { headers: { "x-debug-sink-token": `${token}x` } }), token, env)).toBe(false);
    expect(hasToken(new Request("https://sink.test/v1/logs", { headers: { "x-debug-sink-token": token.slice(0, -1) } }), token, env)).toBe(false);
    expect(hasToken(new Request("https://sink.test/v1/logs"), token, env)).toBe(false);
  });

  it("fails closed without a configured token unless explicitly allowed", () => {
    expect(hasToken(new Request("https://sink.test/v1/logs"), undefined, env)).toBe(false);
    expect(hasToken(new Request("https://sink.test/v1/logs"), undefined, { DEBUG_SINK_ALLOW_UNAUTHENTICATED: "true" } as Env)).toBe(true);
  });
});

describe("account service debug sink URL per environment", () => {
  const config = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../../services/account/config/environments.json"), "utf8")
  );

  it("sends pre and live diagnostics nowhere unless a sink URL is configured for them", () => {
    for (const environment of ["pre", "live"]) {
      expect(renderConfig(config, environment)).not.toContain("DEBUG_SINK_URL");
    }
  });

  it("keeps the dev sink for local and dev", () => {
    for (const environment of ["local", "dev"]) {
      expect(renderConfig(config, environment)).toContain(
        'DEBUG_SINK_URL = "https://nucleus-debug-sink.21n-dev.workers.dev"'
      );
    }
  });
});
