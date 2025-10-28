import http from "node:http";
import path from "node:path";
import { AddressInfo } from "node:net";

import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createServer as createViteServer } from "vite";

const repoRoot = path.resolve(__dirname, "..", "..");

async function bootApp(app: string) {
  const root = path.join(repoRoot, "apps", app);

  const staticRequests: string[] = [];
  const staticServer = http.createServer((req, res) => {
    staticRequests.push(req.url ?? "");
    if (req.url === `/${app}/live.json`) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          product: app,
          environment: "live",
          build: "integration"
        })
      );
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve) => staticServer.listen(0, resolve));
  const staticPort = (staticServer.address() as AddressInfo).port;

  const previousEnv = {
    VITE_STATIC_URL: process.env.VITE_STATIC_URL,
    VITE_ENV: process.env.VITE_ENV,
    VITE_PRODUCT: process.env.VITE_PRODUCT
  };

  process.env.VITE_STATIC_URL = `http://127.0.0.1:${staticPort}`;
  process.env.VITE_ENV = "live";
  process.env.VITE_PRODUCT = app;
  const previousCwd = process.cwd();
  process.chdir(root);

  let vite: Awaited<ReturnType<typeof createViteServer>>;
  try {
    vite = await createViteServer({
      configFile: path.join(root, "vite.config.ts"),
      root,
      server: {
        middlewareMode: true,
        hmr: false
      }
    });
  } catch (error) {
    process.chdir(previousCwd);
    await new Promise<void>((resolve, reject) => {
      staticServer.close((closeError) => {
        if (closeError) reject(closeError);
        else resolve();
      });
    });

    process.env.VITE_STATIC_URL = previousEnv.VITE_STATIC_URL;
    process.env.VITE_ENV = previousEnv.VITE_ENV;
    process.env.VITE_PRODUCT = previousEnv.VITE_PRODUCT;

    throw error;
  }

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
    staticRequests,
    async teardown() {
      await vite.close();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        staticServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      process.chdir(previousCwd);

      process.env.VITE_STATIC_URL = previousEnv.VITE_STATIC_URL;
      process.env.VITE_ENV = previousEnv.VITE_ENV;
      process.env.VITE_PRODUCT = previousEnv.VITE_PRODUCT;
    }
  };
}

const apps = ["nucleus", "memotron", "pointron"] as const;
const runAppIntegrations = process.env.RUN_APP_INTEGRATION === "1";
const describeApp = runAppIntegrations ? describe : describe.skip;

describeApp.each(apps)("%s app bootstrap", (app) => {
  it("serves the index route with a 200 status", async () => {
    const instance = await bootApp(app);

    try {
      const response = await fetch(instance.url);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html.toLowerCase()).toContain("<!doctype html>");
      expect(html).toMatch(new RegExp(app, "i"));

      const dom = new JSDOM(html);
      const preloadAttribute = dom.window.document.body.getAttribute(
        "data-sveltekit-preload-data"
      );
      const bootstrapScript = dom.window.document.querySelector("script");

      expect(preloadAttribute).toBe("hover");
      expect(bootstrapScript?.textContent).toContain("kit.start");

      const manifestHits = instance.staticRequests.filter(
        (requestPath) => requestPath === `/${app}/live.json`
      );
      expect(manifestHits.length).toBeGreaterThan(0);
    } finally {
      await instance.teardown();
    }
  }, 60_000);
});
