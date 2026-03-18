import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import type { FullConfig } from "@playwright/test";

type ViteHarness = {
  close: () => Promise<void>;
  url: string;
  process: ChildProcess;
};

async function startVite(app: string): Promise<ViteHarness> {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const root = path.join(repoRoot, app);
  const port = 5173;
  const url = `http://127.0.0.1:${port}`;
  
  console.log(`🚀 Starting dev server for ${app} on port ${port}...`);
  
  const viteProcess = spawn("npm", ["run", "dev", "--", "--port", port.toString(), "--host", "127.0.0.1"], {
    cwd: root,
    stdio: "pipe",
    shell: true
  });

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        viteProcess.kill("SIGTERM");
        reject(new Error("Timeout waiting for dev server to start"));
      }
    }, 60000);

    viteProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      process.stdout.write(output);
      
      if (output.includes("Local:") || output.includes("ready in")) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log(`✅ Dev server started at ${url}`);
          resolve({
            url,
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

const PER_PROJECT_URL_KEYS = [
  "APP_BASE_URL_NUCLEUM",
  "APP_BASE_URL_NUCLEUS",
  "APP_BASE_URL_MEMOTRON",
  "APP_BASE_URL_POINTRON"
] as const;

function areAllPerProjectBaseUrlsSet(): boolean {
  return PER_PROJECT_URL_KEYS.every((key) => Boolean(process.env[key]?.trim()));
}

function getFirstPerProjectBaseUrl(): string | undefined {
  return PER_PROJECT_URL_KEYS.map((key) => process.env[key]?.trim()).find((v) => Boolean(v));
}

export default async function globalSetup(_: FullConfig) {
  const explicitBaseUrl = process.env.APP_BASE_URL?.trim();
  const perProjectUrl = getFirstPerProjectBaseUrl();

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

  const targetApp = process.env.PLAYWRIGHT_APP ?? "apps/nucleus";
  console.log(`🚀 Starting Vite server for ${targetApp}...`);
  const harness = await startVite(targetApp);
  process.env.APP_BASE_URL = harness.url;
  console.log(`📝 Set APP_BASE_URL to ${harness.url}`);
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
