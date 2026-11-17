import fs from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FILE_PROCESSING_CONTAINER_PORT,
  FILE_PROCESSING_MAX_RETRIES,
  FILE_PROCESSING_RETRY_DELAY_SECONDS
} from "../../../services/account/src/files/processing";
import {
  FILE_CLEANUP_CRON,
  FILE_PROCESSING_CONSUMER,
  FILE_PROCESSING_IMAGE,
  FILE_PROCESSING_IMAGE_BUILD_CONTEXT,
  renderConfig
} from "../../../services/account/scripts/wrangler-config.mjs";

const repoRoot = path.resolve(__dirname, "../../..");
const serviceRoot = path.join(repoRoot, "services/account");
const environmentsConfig = JSON.parse(
  fs.readFileSync(path.join(serviceRoot, "config/environments.json"), "utf8")
);
const dockerfile = fs.readFileSync(path.join(repoRoot, "services/file-processing/Dockerfile"), "utf8");

function withMode(environment: string, mode: unknown) {
  const config = structuredClone(environmentsConfig);
  config.environments[environment].fileProcessingMode = mode;
  return config;
}

/** The generated sections of one regional Worker env, by TOML table header. */
function regionalSections(rendered: string, wranglerEnv: string): string[] {
  return rendered
    .split(/\n(?=\[)/)
    .filter((section) => section.startsWith(`[env.${wranglerEnv}.`) || section.startsWith(`[[env.${wranglerEnv}.`));
}

/** The processing-related part of a regional env: mode var, cron, queues, container and its secret. */
function processingSections(rendered: string, wranglerEnv: string): string {
  const sections = regionalSections(rendered, wranglerEnv);
  const mode = sections
    .find((section) => section.startsWith(`[env.${wranglerEnv}.vars]`))
    ?.split("\n")
    .find((line) => line.startsWith("FILEFN_PROCESSING_MODE"));
  const processing = sections.filter(
    (section) =>
      /\.(triggers|queues\.producers|queues\.consumers|containers|migrations)\]/.test(section) ||
      /\bname = "FILEFN_PROCESSING_CONTAINER"/.test(section) ||
      /\bbinding = "FILEFN_PROCESSING_DATABASE_URL"/.test(section)
  );
  return [mode, ...processing].join("\n").trim();
}

describe("account Worker config for file processing", () => {
  it("sets local mode in every checked-in environment", () => {
    for (const [environment, envConfig] of Object.entries<any>(environmentsConfig.environments)) {
      expect(envConfig.fileProcessingMode, environment).toBe("local");
    }
  });

  it("runs the cleanup cron in every region in local mode, with no queue or container", () => {
    for (const [environment, envConfig] of Object.entries<any>(environmentsConfig.environments)) {
      const rendered = renderConfig(environmentsConfig, environment);
      for (const { wranglerEnv } of Object.values<any>(envConfig.regions)) {
        const section = processingSections(rendered, wranglerEnv);
        expect(section, wranglerEnv).toBe(
          ['FILEFN_PROCESSING_MODE = "local"', `[env.${wranglerEnv}.triggers]`, `crons = ["${FILE_CLEANUP_CRON}"]`].join("\n")
        );
      }
      expect(rendered).not.toContain("queues");
      expect(rendered).not.toContain("FileProcessingContainer");
    }
  });

  it.each(["remote", "both"])("renders the queue, consumer, container and cron for every region in %s mode", (mode) => {
    for (const environment of Object.keys(environmentsConfig.environments)) {
      const rendered = renderConfig(withMode(environment, mode), environment);
      const regions = Object.values<any>(environmentsConfig.environments[environment].regions);
      const snapshot = Object.fromEntries(
        regions.map(({ wranglerEnv }) => [wranglerEnv, processingSections(rendered, wranglerEnv)])
      );
      expect(snapshot).toMatchSnapshot(`${environment} ${mode}`);
      for (const { wranglerEnv } of regions) {
        const region = wranglerEnv.slice(wranglerEnv.indexOf("-") + 1);
        expect(snapshot[wranglerEnv]).toContain(`queue = "nucleus-account-${environment}-${region}-file-processing"`);
      }
    }
  });

  it("rejects an unknown fileProcessingMode", () => {
    expect(() => renderConfig(withMode("dev", "container"), "dev")).toThrow(/fileProcessingMode/);
  });

  it("keeps the consumer, the Worker and the container image in agreement", () => {
    expect(FILE_PROCESSING_CONSUMER.maxRetries).toBe(FILE_PROCESSING_MAX_RETRIES);
    expect(FILE_PROCESSING_CONSUMER.retryDelaySeconds).toBe(FILE_PROCESSING_RETRY_DELAY_SECONDS);
    expect(dockerfile).toMatch(new RegExp(`FILEFN_PROCESSING_MAX_RETRIES=${FILE_PROCESSING_MAX_RETRIES}\\b`));
    expect(dockerfile).toMatch(
      new RegExp(`FILEFN_CONTAINER_MAX_CONCURRENT_JOBS=${FILE_PROCESSING_CONSUMER.maxConcurrency}\\b`)
    );
    expect(dockerfile).toContain(`EXPOSE ${FILE_PROCESSING_CONTAINER_PORT}`);
    // Image paths are relative to services/account/.wrangler, where the config is written.
    const wranglerDir = path.join(serviceRoot, ".wrangler");
    expect(path.resolve(wranglerDir, FILE_PROCESSING_IMAGE)).toBe(path.join(repoRoot, "services/file-processing/Dockerfile"));
    expect(path.resolve(wranglerDir, FILE_PROCESSING_IMAGE_BUILD_CONTEXT)).toBe(repoRoot);
    for (const copied of dockerfile.matchAll(/^COPY (\S+)/gm)) {
      expect(fs.existsSync(path.join(repoRoot, copied[1])), copied[1]).toBe(true);
    }
  });
});

describe("account Worker bundle with file processing", () => {
  it("bundles the queue producer and container class but no processor implementation", async () => {
    // Wrangler's esbuild settings for the Worker entry; `npm run worker:build` is covered elsewhere.
    const { build } = await import("esbuild");
    const result = await build({
      entryPoints: [path.join(serviceRoot, "src/worker.ts")],
      bundle: true,
      write: false,
      metafile: true,
      format: "esm",
      platform: "neutral",
      target: "es2022",
      conditions: ["workerd", "worker", "browser"],
      mainFields: ["module", "main"],
      // nodejs_compat provides the Node built-ins.
      external: ["cloudflare:*", "node:*", ...builtinModules],
      logLevel: "silent"
    });
    const inputs = Object.keys(result.metafile.inputs);
    expect(inputs.some((input) => input.includes("@filefn/processing/dist/queues/cloudflare"))).toBe(true);
    expect(inputs.some((input) => input.includes("@cloudflare/containers"))).toBe(true);
    expect(inputs.some((input) => input.includes("file-processing/src/descriptors"))).toBe(true);
    expect(
      inputs.filter((input) =>
        /node_modules\/(sharp|tesseract\.js)\/|@filefn\/processing\/dist\/(index|processors)|file-processing\/src\/processors/.test(input)
      )
    ).toEqual([]);
  }, 120_000);
});
