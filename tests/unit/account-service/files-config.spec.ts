import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createAccountFileStorage,
  readAccountFileStorageConfig,
  resolveAccountFileBucket
} from "../../../services/account/src/files/storage";
import {
  renderConfig,
  renderWranglerConfig,
  secretStoreBindingsForEnvironment
} from "../../../services/account/scripts/wrangler-config.mjs";

const serviceRoot = path.resolve(__dirname, "../../../services/account");
const environmentsConfig = JSON.parse(
  fs.readFileSync(path.join(serviceRoot, "config/environments.json"), "utf8")
);
const R2_SECRET_KEYS = [
  "FILEFN_R2_ACCOUNT_ID",
  "FILEFN_R2_ACCESS_KEY_ID",
  "FILEFN_R2_SECRET_ACCESS_KEY"
];
const R2_ENV = {
  FILEFN_R2_ACCOUNT_ID: "account",
  FILEFN_R2_ACCESS_KEY_ID: "access",
  FILEFN_R2_SECRET_ACCESS_KEY: "secret",
  FILEFN_R2_BUCKET: "nucleus-files-dev-{region}"
};

describe("FileFn R2 storage config", () => {
  it("resolves the bucket for the service's region", () => {
    expect(readAccountFileStorageConfig(R2_ENV, "useast")).toEqual({
      accountId: "account",
      accessKeyId: "access",
      secretAccessKey: "secret",
      bucket: "nucleus-files-dev-useast"
    });
    expect(resolveAccountFileBucket("fixed-bucket", "euwest")).toBe("fixed-bucket");
  });

  it("is unconfigured when any key is missing or blank", () => {
    for (const key of Object.keys(R2_ENV)) {
      expect(readAccountFileStorageConfig({ ...R2_ENV, [key]: undefined }, "insouth"), key).toBeNull();
      expect(readAccountFileStorageConfig({ ...R2_ENV, [key]: "  " }, "insouth"), key).toBeNull();
      expect(createAccountFileStorage({ ...R2_ENV, [key]: undefined }, "insouth"), key).toBeNull();
    }
  });

  it("rejects bucket names R2 would not accept", () => {
    for (const template of ["Upper-{region}", "has_underscore", "a", `${"x".repeat(64)}`, "-leading"]) {
      expect(() => resolveAccountFileBucket(template, "insouth"), template).toThrow(/FILEFN_R2_BUCKET/);
    }
  });

  it("signs requests against the region's bucket", async () => {
    const urls: string[] = [];
    const storage = createAccountFileStorage(R2_ENV, "euwest", {
      endpoint: "https://r2.test",
      fetch: async (input) => {
        urls.push(input);
        return new Response(null, { status: 404 });
      }
    });
    await expect(storage!.statObject({ key: "a/b.txt" })).rejects.toThrow();
    expect(urls.map((url) => new URL(url).pathname)).toEqual(["/nucleus-files-dev-euwest/a/b.txt"]);
  });
});

describe("account Worker config for FileFn", () => {
  it("renders one bucket per region in every environment", () => {
    for (const environment of ["local", "dev", "pre", "live"]) {
      const rendered = renderConfig(environmentsConfig, environment);
      const bucketSuffix = environment === "local" ? "dev" : environment;
      for (const region of ["insouth", "useast", "euwest"]) {
        const wranglerEnv = environmentsConfig.environments[environment].regions[region].wranglerEnv;
        const section = rendered.split(`[env.${wranglerEnv}.vars]`)[1]?.split("\n[")[0] ?? "";
        expect(section, `${environment}/${region}`).toContain(
          `FILEFN_R2_BUCKET = "nucleus-files-${bucketSuffix}-${region}"`
        );
      }
    }
  });

  it("registers the R2 secrets for sync but binds none until they are provisioned", () => {
    for (const secret of R2_SECRET_KEYS) {
      expect(environmentsConfig.secretsStore.names[secret]).toBe(`NUCLEUS_ACCOUNT_{ENV}_${secret}`);
    }
    for (const environment of ["local", "dev", "pre", "live"]) {
      const bindings = secretStoreBindingsForEnvironment(environmentsConfig, environment).map(
        (binding: { binding: string }) => binding.binding
      );
      for (const secret of R2_SECRET_KEYS) {
        expect(bindings, `${environment}/${secret}`).not.toContain(secret);
      }
      expect(bindings, environment).toContain("RESEND_API_KEY");
    }
  });
});

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: serviceRoot,
    encoding: "utf8",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    shell: process.platform === "win32"
  });
  expect(result.status, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`).toBe(0);
}

describe("account Worker bundle", () => {
  it("worker:build output contains FileFn and storage-r2 but no @aws-sdk module", () => {
    const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "account-worker-build-"));
    try {
      const wranglerConfig = renderWranglerConfig(serviceRoot, environmentsConfig, "dev");
      const wranglerEnv = environmentsConfig.environments.dev.regions.insouth.wranglerEnv;
      const metafile = path.join(outdir, "meta.json");
      run("npm", ["run", "build"]);
      run("npx", [
        "wrangler",
        "deploy",
        "--config",
        wranglerConfig,
        "--env",
        wranglerEnv,
        "--dry-run",
        "--outdir",
        outdir,
        "--metafile",
        metafile
      ]);
      const inputs = Object.keys(JSON.parse(fs.readFileSync(metafile, "utf8")).inputs);
      expect(inputs.some((input) => input.includes("@superfunctions/storage-r2"))).toBe(true);
      expect(inputs.some((input) => input.includes("@filefn/server"))).toBe(true);
      expect(inputs.filter((input) => input.includes("@aws-sdk"))).toEqual([]);
    } finally {
      fs.rmSync(outdir, { recursive: true, force: true });
    }
  }, 300_000);
});
