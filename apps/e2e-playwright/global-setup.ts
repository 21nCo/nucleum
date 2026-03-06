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

export default async function globalSetup(_: FullConfig) {
  if (process.env.APP_BASE_URL) {
    const baseURL = process.env.APP_BASE_URL;
    console.log(`📝 Using APP_BASE_URL (e.g. from .env): ${baseURL}`);

    const authDir = path.join(__dirname, ".auth");
    const authFiles = ["user.json", "user-memotron.json", "user-pointron.json"];
    try {
      const fs = await import("node:fs");
      const currentOrigin = new URL(baseURL).origin;
      for (const file of authFiles) {
        const authPath = path.join(authDir, file);
        if (fs.existsSync(authPath)) {
          const raw = fs.readFileSync(authPath, "utf-8");
          const state = JSON.parse(raw) as { origins?: Array<{ origin: string }> };
          const savedOrigins = state.origins?.map((o) => o.origin) ?? [];
          if (savedOrigins.length > 0 && !savedOrigins.includes(currentOrigin)) {
            console.warn(
              `\n⚠️  Auth in ${file} was saved for origin(s): ${savedOrigins.join(", ")} but APP_BASE_URL is ${baseURL}.`,
              `\n   Set APP_BASE_URL_<PROJECT> in .env to match (e.g. APP_BASE_URL_MEMOTRON=${savedOrigins[0]}).\n`
            );
          }
        }
      }
    } catch (err) {
      console.warn("[e2e] Could not check auth origin vs APP_BASE_URL:", err);
    }

    (globalThis as any).__viteHarness = { close: async () => {} };
    return baseURL;
  }

  const targetApp = process.env.PLAYWRIGHT_APP ?? "apps/nucleus";
  console.log(`🚀 Starting Vite server for ${targetApp}...`);
  const harness = await startVite(targetApp);
  process.env.APP_BASE_URL = harness.url;
  console.log(`📝 Set APP_BASE_URL to ${harness.url}`);
  (globalThis as any).__viteHarness = harness;
  return harness.url;
}
