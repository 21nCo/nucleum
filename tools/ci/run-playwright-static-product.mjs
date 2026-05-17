import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { lookup } from "mrmime";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const e2eRoot = path.join(repoRoot, "apps", "e2e-playwright");
const frontendRoot = path.join(repoRoot, "services", "frontend");
const frontendConfigUrl = pathToFileURL(
  path.join(frontendRoot, "scripts", "frontend-config.mjs")
);

const {
  buildEnv,
  parseProducts,
  readConfig,
  readEnvironment
} = await import(frontendConfigUrl.href);

function parseArgs(argv) {
  const args = {};
  const passthrough = [];

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (part === "--") {
      passthrough.push(...argv.slice(index + 1));
      break;
    }
    if (!part.startsWith("--")) continue;

    const [key, inlineValue] = part.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = next;
    index += 1;
  }

  args.passthrough = passthrough;
  return args;
}

function validateArgs(args, config) {
  const product = args.product?.trim() ?? "nucleum";
  const environment = args.environment?.trim() ?? "dev";
  const suite = args.suite?.trim() ?? "all";
  const port = Number(args.port ?? defaultPort(product));

  parseProducts(config, product);
  readEnvironment(config, environment);

  if (!new Set(["app-smoke", "smoke", "regression", "all"]).has(suite)) {
    throw new Error("Expected --suite to be one of: app-smoke, smoke, regression, all");
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("Expected --port to be a positive integer");
  }

  return {
    product,
    environment,
    suite,
    port,
    skipBuild: args["skip-build"] === "true",
    reporter: args.reporter?.trim(),
    retries: args.retries?.trim(),
    workers: args.workers?.trim(),
    passthrough: args.passthrough ?? []
  };
}

function defaultPort(product) {
  if (product === "pointron") return 5001;
  if (product === "memotron") return 5002;
  return 5050;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n$ ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: {
        ...process.env,
        ...(options.env ?? {})
      },
      shell: process.platform === "win32",
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with code ${code ?? "null"} signal ${signal ?? "null"}`
        )
      );
    });
  });
}

function createStaticServer(buildDir) {
  const server = http.createServer((request, response) => {
    if (!request.url) {
      response.writeHead(400);
      response.end("Bad request");
      return;
    }

    const url = new URL(request.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const candidate = path.normalize(path.join(buildDir, pathname));
    const isInsideBuild =
      candidate === buildDir || candidate.startsWith(`${buildDir}${path.sep}`);
    const assetPath = isInsideBuild && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      ? candidate
      : path.join(buildDir, "index.html");

    const body = fs.readFileSync(assetPath);
    response.writeHead(200, {
      "content-type": lookup(assetPath) ?? "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(body);
  });

  return {
    listen(port) {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.off("error", reject);
          resolve();
        });
      });
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    }
  };
}

function playwrightEnv(product, baseUrl) {
  const env = {
    ...process.env,
    APP_BASE_URL: baseUrl,
    PRODUCT: product
  };

  if (product === "nucleum") {
    env.APP_BASE_URL_NUCLEUM = baseUrl;
    env.APP_BASE_URL_NUCLEUS = baseUrl;
  } else {
    env[`APP_BASE_URL_${product.toUpperCase()}`] = baseUrl;
  }

  return env;
}

function suiteArgs(suite) {
  if (suite === "app-smoke") return ["tests/smoke"];
  if (suite === "smoke") return ["--grep", "@smoke"];
  if (suite === "regression") return ["--grep", "@regression"];
  return [];
}

async function main() {
  const config = readConfig(frontendRoot);
  const args = validateArgs(parseArgs(process.argv.slice(2)), config);
  const productConfig = config.products[args.product];
  const envConfig = readEnvironment(config, args.environment);
  const buildDir = path.join(repoRoot, productConfig.appPath, "build");

  if (!args.skipBuild) {
    await run("npm", ["--workspace", productConfig.workspace, "run", envConfig.buildScript], {
      cwd: repoRoot,
      env: buildEnv(config, args.environment, args.product)
    });
  }

  if (!fs.existsSync(path.join(buildDir, "index.html"))) {
    throw new Error(`Missing static build output: ${path.join(buildDir, "index.html")}`);
  }

  const server = createStaticServer(buildDir);
  const baseUrl = `http://127.0.0.1:${args.port}`;
  await server.listen(args.port);
  console.log(`[playwright-static] Serving ${buildDir} at ${baseUrl}`);

  try {
    const reporterArgs = args.reporter ? [`--reporter=${args.reporter}`] : [];
    const retryArgs = args.retries ? [`--retries=${args.retries}`] : [];
    const workerArgs = args.workers ? [`--workers=${args.workers}`] : [];
    await run(
      "npx",
      [
        "playwright",
        "test",
        `--project=${args.product}`,
        ...args.passthrough,
        ...suiteArgs(args.suite),
        ...retryArgs,
        ...workerArgs,
        ...reporterArgs
      ],
      {
        cwd: e2eRoot,
        env: playwrightEnv(args.product, baseUrl)
      }
    );
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exit(1);
});
