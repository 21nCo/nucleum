import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

const repoRoot = path.resolve(__dirname, "../../..");
const serviceRoot = path.join(repoRoot, "services/account");
const apps = ["memotron", "pointron", "nucleum"] as const;
const CHECK_TIMEOUT_MS = 120_000;

type OpenApiSpec = {
  info: { version: string };
  paths: Record<string, Record<string, Record<string, unknown>>>;
};

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function readCommittedSpec(app: (typeof apps)[number]): OpenApiSpec {
  return JSON.parse(fs.readFileSync(path.join(serviceRoot, "openapi", `${app}.json`), "utf8"));
}

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "openapi-check-"));
  tempDirs.push(dir);
  return dir;
}

function writeSpec(dir: string, name: string, spec: OpenApiSpec): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
  return file;
}

/** Runs the account service's npm script, the command the Tests workflow runs. */
function runOpenApiCheck(args: string[]) {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1" };
  delete env.FORCE_COLOR;
  const result = spawnSync("npm", ["run", "--silent", "openapi:check", "--", ...args], {
    cwd: serviceRoot,
    env,
    encoding: "utf8"
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/** The output apifn printed for one app, between the runner's per-app headers. */
function appSection(output: string, app: string): string {
  const start = output.indexOf(`== apifn check: ${app} ==`);
  expect(start, `no section for ${app}`).toBeGreaterThanOrEqual(0);
  const next = output.indexOf("== apifn check: ", start + 1);
  return output.slice(start, next === -1 ? undefined : next);
}

describe("openapi:check (apifn check gate for the committed /v1 specs)", () => {
  it(
    "passes for every app's committed spec against its router and the base ref",
    () => {
      const { status, output } = runOpenApiCheck(["--base", "HEAD"]);

      expect(status, output).toBe(0);
      for (const app of apps) {
        const section = appSection(output, app);
        expect(section).toContain("apifn check: PASS");
        expect(section).toContain(`Spec:     openapi/${app}.json`);
        expect(section).toContain("Drift:    none");
        expect(section).toContain("Base:     git ref HEAD");
      }
      expect(output).toContain("openapi:check memotron=pass pointron=pass nucleum=pass");
    },
    CHECK_TIMEOUT_MS
  );

  it(
    "fails with drift reported when one app's spec is stale, still checking the others",
    () => {
      const dir = makeTempDir();
      for (const app of apps) writeSpec(dir, `${app}.json`, readCommittedSpec(app));
      const stale = readCommittedSpec("memotron");
      expect(stale.paths["/v1/memotron/collections"]?.post).toBeDefined();
      delete stale.paths["/v1/memotron/collections"].post;
      const staleFile = writeSpec(dir, "memotron.json", stale);
      const staleBytes = fs.readFileSync(staleFile, "utf8");

      const { status, output } = runOpenApiCheck(["--spec-dir", dir]);

      expect(status, output).toBe(1);
      const memotron = appSection(output, "memotron");
      expect(memotron).toContain("apifn check: FAIL");
      expect(memotron).toContain("Drift:    committed spec differs from the router");
      for (const app of ["pointron", "nucleum"]) {
        expect(appSection(output, app)).toContain("apifn check: PASS");
      }
      expect(output).toContain("openapi:check memotron=fail(1) pointron=pass nucleum=pass");
      // CI never repairs a spec: without --write the stale file is left as it was.
      expect(fs.readFileSync(staleFile, "utf8")).toBe(staleBytes);
    },
    CHECK_TIMEOUT_MS
  );

  it(
    "fails a breaking change unless the base's major version is lower",
    () => {
      const dir = makeTempDir();
      const base = readCommittedSpec("memotron");
      const collection = base.paths["/v1/memotron/collections/{id}"];
      expect(collection?.get).toBeDefined();
      expect(collection.delete).toBeUndefined();
      // The base has an operation the router no longer serves, so the head removes it.
      collection.delete = { ...collection.get, operationId: "deleteMemotronCollectionInBase" };
      const sameVersion = writeSpec(dir, "base-same-version.json", base);
      const olderMajor = writeSpec(dir, "base-older-major.json", {
        ...base,
        info: { ...base.info, version: "0.9.0" }
      });

      const unversioned = runOpenApiCheck(["--app", "memotron", "--base-spec", sameVersion]);
      expect(unversioned.status, unversioned.output).toBe(1);
      expect(unversioned.output).toContain("apifn check: FAIL");
      expect(unversioned.output).toContain("Breaking changes: 1");
      expect(unversioned.output).not.toContain("== apifn check: pointron ==");

      const versioned = runOpenApiCheck(["--app", "memotron", "--base-spec", olderMajor]);
      expect(versioned.status, versioned.output).toBe(0);
      expect(versioned.output).toContain("Versions: base 0.9.0, head 1.0.0");
    },
    CHECK_TIMEOUT_MS
  );

  it("rejects an unknown app and the per-app options it owns before running apifn", () => {
    for (const args of [["--app", "timear"], ["--spec", "openapi/memotron.json"], ["--config", "x.ts"]]) {
      const { status, output } = runOpenApiCheck(args);
      expect(status, args.join(" ")).toBe(2);
      expect(output).toContain("openapi:check:");
      expect(output).not.toContain("== apifn check:");
    }
  });

  it("runs in the Tests workflow on the base branch, never writing specs or allowing breaks", () => {
    const workflow = parse(fs.readFileSync(path.join(repoRoot, ".github/workflows/tests.yml"), "utf8"));
    const jobs = Object.values(workflow.jobs) as Array<{
      steps: Array<{ uses?: string; with?: Record<string, unknown>; run?: string; env?: Record<string, string> }>;
    }>;
    const job = jobs.find((candidate) => candidate.steps.some((step) => step.run?.includes("openapi:check")));
    expect(job, "no Tests job runs openapi:check").toBeDefined();
    const step = job!.steps.find((candidate) => candidate.run?.includes("openapi:check"))!;

    // apifn reads the base spec from git, so the job needs the base branch's history.
    expect(job!.steps.find((candidate) => candidate.uses?.startsWith("actions/checkout@"))?.with?.["fetch-depth"]).toBe(0);
    expect(step.run).toContain('--base "origin/${BASE_REF}"');
    expect(step.env?.BASE_REF).toBe("${{ github.base_ref || github.ref_name }}");
    expect(step.run).not.toMatch(/--write|--allow-breaking|--spec-dir|--app/);
  });
});
