import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import type { FullConfig } from "@playwright/test";

type ViteHarness = {
  close: () => Promise<void>;
  url: string;
  process: ChildProcess;
};

type ProjectKey = "nucleum" | "memotron" | "pointron";

const projectAppMap: Record<ProjectKey, string> = {
  nucleum: "apps/nucleus",
  memotron: "apps/memotron",
  pointron: "apps/pointron"
};

function getRequestedProjectsFromArgv(): ProjectKey[] {
  const values: string[] = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === "--project") {
      const next = process.argv[i + 1];
      if (next) values.push(next);
      continue;
    }
    if (arg.startsWith("--project=")) {
      values.push(arg.slice("--project=".length));
    }
  }
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value): value is ProjectKey =>
      value === "nucleum" || value === "memotron" || value === "pointron"
    );
}

function stripAnsi(value: string | Buffer | null | undefined): string {
  if (value == null) return "";
  const text = typeof value === "string" ? value : value.toString();
  return text.replace(/\u001B\[[0-9;]*m/g, "");
}

function resolveReadyUrl(output: string, port: number): string | undefined {
  const localUrls = Array.from(output.matchAll(/Local:\s+(https?:\/\/[^\s]+)/g));
  const localUrl = localUrls.at(-1)?.[1];
  if (localUrl) return localUrl;
  if (output.includes("ready in") && !output.includes("Port 5173 is in use")) {
    return `http://127.0.0.1:${port}`;
  }
  return undefined;
}

async function startVite(app: string): Promise<ViteHarness> {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const root = path.join(repoRoot, app);
  const port = 5173;
  
  console.log(`🚀 Starting dev server for ${app} on port ${port}...`);
  
  const viteProcess = spawn("npm", ["run", "dev", "--", "--port", port.toString(), "--host", "127.0.0.1"], {
    cwd: root,
    stdio: "pipe",
    shell: true
  });

  return new Promise((resolve, reject) => {
    let resolved = false;
    let outputLog = "";
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        viteProcess.kill("SIGTERM");
        reject(
          new Error(
            `Timeout waiting for dev server to start.${outputLog ? ` Last output:\n${outputLog}` : ""}`
          )
        );
      }
    }, 60000);

    viteProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      process.stdout.write(output);

      const normalized = stripAnsi(output);
      outputLog = (outputLog + normalized).slice(-4000);
      const readyUrl = resolveReadyUrl(outputLog, port);

      if (readyUrl) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log(`✅ Dev server started at ${readyUrl}`);
          resolve({
            url: readyUrl,
            process: viteProcess,
            async close() {
              viteProcess.kill();
            }
          });
        }
      }
    });

    viteProcess.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(data);
      outputLog = (outputLog + stripAnsi(data)).slice(-4000);
    });

    viteProcess.on("error", (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(error);
      }
    });

    viteProcess.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });
  });
}

async function warmUpViteUrl(url: string) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        errors.push(message.text());
      });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForTimeout(2_000);
      } catch (error) {
        errors.push((error as Error).message);
      }
      const hasOptimizeDepFailure = errors.some(
        (error) =>
          /Outdated Optimize Dep/i.test(error) ||
          /Failed to fetch dynamically imported module/i.test(error)
      );
      await page.close();
      if (!hasOptimizeDepFailure) return;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  } finally {
    await browser.close();
  }
}

const PER_PROJECT_URL_KEYS = [
  "APP_BASE_URL_NUCLEUM",
  "APP_BASE_URL_NUCLEUS",
  "APP_BASE_URL_MEMOTRON",
  "APP_BASE_URL_POINTRON"
] as const;

function getPerProjectBaseUrl(project: ProjectKey): string | undefined {
  if (project === "nucleum") {
    return (
      process.env.APP_BASE_URL_NUCLEUM?.trim() ??
      process.env.APP_BASE_URL_NUCLEUS?.trim()
    );
  }
  const envKey =
    project === "memotron" ? "APP_BASE_URL_MEMOTRON" : "APP_BASE_URL_POINTRON";
  return process.env[envKey]?.trim();
}

function setPerProjectBaseUrl(project: ProjectKey, url: string) {
  if (project === "nucleum") {
    process.env.APP_BASE_URL_NUCLEUM = url;
    process.env.APP_BASE_URL_NUCLEUS = url;
    return;
  }
  if (project === "memotron") {
    process.env.APP_BASE_URL_MEMOTRON = url;
    return;
  }
  process.env.APP_BASE_URL_POINTRON = url;
}

function areAllPerProjectBaseUrlsSet(): boolean {
  return PER_PROJECT_URL_KEYS.every((key) => Boolean(process.env[key]?.trim()));
}

function getFirstPerProjectBaseUrl(): string | undefined {
  return PER_PROJECT_URL_KEYS.map((key) => process.env[key]?.trim()).find((v) => Boolean(v));
}

export default async function globalSetup(config: FullConfig) {
  const explicitBaseUrl = process.env.APP_BASE_URL?.trim();
  const perProjectUrl = getFirstPerProjectBaseUrl();
  const requestedProjectsFromArgv = getRequestedProjectsFromArgv();
  const requestedProjects = (requestedProjectsFromArgv.length > 0
    ? requestedProjectsFromArgv
    : config.projects
    .map((project) => project.name)
    .filter((name): name is ProjectKey =>
      name === "nucleum" || name === "memotron" || name === "pointron"
    ));

  if (explicitBaseUrl) {
    console.log(`📝 Using APP_BASE_URL (e.g. from .env): ${explicitBaseUrl}`);
    (globalThis as any).__viteHarness = { close: async () => {} };
    await warnAuthOriginMismatch(explicitBaseUrl);
    return explicitBaseUrl;
  }

  if (perProjectUrl) {
    console.log(
      `📝 Using per-project base URLs from .env (e.g. ${perProjectUrl}). No dev server started — ensure app(s) are running at those URLs.`
    );
    await warnAuthOriginMismatch(perProjectUrl, {
      nucleum: process.env.APP_BASE_URL_NUCLEUM?.trim() ?? process.env.APP_BASE_URL_NUCLEUS?.trim(),
      memotron: process.env.APP_BASE_URL_MEMOTRON?.trim(),
      pointron: process.env.APP_BASE_URL_POINTRON?.trim()
    });
    if (areAllPerProjectBaseUrlsSet()) {
      (globalThis as any).__viteHarness = { close: async () => {} };
      return perProjectUrl;
    }
    console.log(
      "📝 Only some per-project base URLs are set; starting local dev server for remaining projects."
    );
  }

  const missingProjects = requestedProjects.filter(
    (project) => !getPerProjectBaseUrl(project)
  );

  if (missingProjects.length > 1) {
    const harnesses: ViteHarness[] = [];
    for (const project of missingProjects) {
      const app = projectAppMap[project];
      console.log(`🚀 Starting Vite server for ${app}...`);
      const harness = await startVite(app);
      harnesses.push(harness);
      setPerProjectBaseUrl(project, harness.url);
      console.log(`📝 Set ${project} base URL to ${harness.url}`);
    }
    for (const harness of harnesses) {
      await warmUpViteUrl(harness.url);
    }
    (globalThis as any).__viteHarnesses = harnesses;
    (globalThis as any).__viteHarness = {
      close: async () => {
        await Promise.all(harnesses.map((harness) => harness.close()));
      }
    };
    return getPerProjectBaseUrl(missingProjects[0]) ?? defaultBaseURL;
  }

  const targetProject =
    missingProjects[0] ??
    requestedProjects[0] ??
    ((process.env.PLAYWRIGHT_APP === "apps/memotron"
      ? "memotron"
      : process.env.PLAYWRIGHT_APP === "apps/pointron"
        ? "pointron"
        : "nucleum") as ProjectKey);
  const targetApp = process.env.PLAYWRIGHT_APP ?? projectAppMap[targetProject];
  console.log(`🚀 Starting Vite server for ${targetApp}...`);
  const harness = await startVite(targetApp);
  process.env.APP_BASE_URL = harness.url;
  setPerProjectBaseUrl(targetProject, harness.url);
  console.log(`📝 Set APP_BASE_URL to ${harness.url}`);
  await warmUpViteUrl(harness.url);
  (globalThis as any).__viteHarness = harness;
  return harness.url;
}

async function warnAuthOriginMismatch(
  baseURL: string,
  perProjectBaseUrls?: Partial<Record<"nucleum" | "memotron" | "pointron", string | undefined>>
) {
  const authDir = path.join(__dirname, ".auth");
  const authFiles: Array<{ file: string; expectedBaseUrl?: string }> = [
    { file: "user.json", expectedBaseUrl: perProjectBaseUrls?.nucleum ?? baseURL },
    { file: "user-memotron.json", expectedBaseUrl: perProjectBaseUrls?.memotron ?? baseURL },
    { file: "user-pointron.json", expectedBaseUrl: perProjectBaseUrls?.pointron ?? baseURL }
  ];
  try {
    const fs = await import("node:fs");
    for (const { file, expectedBaseUrl } of authFiles) {
      if (!expectedBaseUrl) continue;
      const currentOrigin = new URL(expectedBaseUrl).origin;
      const authPath = path.join(authDir, file);
      if (fs.existsSync(authPath)) {
        const raw = fs.readFileSync(authPath, "utf-8");
        const state = JSON.parse(raw) as { origins?: Array<{ origin: string }> };
        const savedOrigins = state.origins?.map((o) => o.origin) ?? [];
        if (savedOrigins.length > 0 && !savedOrigins.includes(currentOrigin)) {
          console.warn(
            `\n⚠️  Auth in ${file} was saved for origin(s): ${savedOrigins.join(", ")} but expected base URL is ${expectedBaseUrl}.`,
            `\n   Set APP_BASE_URL_<PROJECT> in .env to match (e.g. APP_BASE_URL_MEMOTRON=${savedOrigins[0]}).\n`
          );
        }
      }
    }
  } catch (err) {
    console.warn("[e2e] Could not check auth origin vs APP_BASE_URL:", err);
  }
}
