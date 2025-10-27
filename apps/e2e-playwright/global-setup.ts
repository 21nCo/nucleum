import http from "node:http";
import path from "node:path";
import { AddressInfo } from "node:net";

import type { FullConfig } from "@playwright/test";
import { createServer as createViteServer } from "vite";

type ViteHarness = {
  close: () => Promise<void>;
  url: string;
};

async function startVite(app: string): Promise<ViteHarness> {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const root = path.join(repoRoot, app);
  const vite = await createViteServer({
    root,
    configFile: path.join(root, "vite.config.ts"),
    server: {
      middlewareMode: true
    }
  });

  const server = http.createServer((req, res) => {
    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end();
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    async close() {
      await vite.close();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  };
}

export default async function globalSetup(_: FullConfig) {
  const targetApp = process.env.PLAYWRIGHT_APP ?? "apps/pointron";
  const harness = await startVite(targetApp);

  process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? harness.url;

  (globalThis as any).__viteHarness = harness;
}
