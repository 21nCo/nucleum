import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const e2eRoot = path.join(repoRoot, "apps", "e2e-playwright");

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
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

  return args;
}

function validateArgs(args) {
  const product = args.product?.trim();
  const workspace = args.workspace?.trim();
  const port = Number(args.port);
  const suite = args.suite?.trim();
  const baseUrl = args["base-url"]?.trim();

  if (!product || !new Set(["nucleum", "memotron", "pointron"]).has(product)) {
    throw new Error(
      "Expected --product to be one of: nucleum, memotron, pointron"
    );
  }

  if (!workspace) {
    throw new Error("Expected --workspace");
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("Expected --port to be a positive integer");
  }

  if (!suite || !new Set(["smoke", "regression"]).has(suite)) {
    throw new Error("Expected --suite to be one of: smoke, regression");
  }

  if (baseUrl) {
    try {
      new URL(baseUrl);
    } catch {
      throw new Error("Expected --base-url to be a valid absolute URL");
    }
  }

  return { product, workspace, port, suite, baseUrl };
}

function spawnLogged(command, args, options) {
  const stdio = options?.stdio ?? ["ignore", "pipe", "pipe"];
  const child = spawn(command, args, {
    ...options,
    stdio
  });

  if (child.stdout) {
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
  }

  return child;
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawnLogged(command, args, options);
    let settled = false;

    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      handler(value);
    };

    child.on("error", (error) => {
      finish(reject, error);
    });
    child.on("close", (code, signal) => {
      if (code === 0) {
        finish(resolve);
        return;
      }

      finish(
        reject,
        new Error(
          `${command} ${args.join(" ")} failed with code ${code ?? "null"} signal ${signal ?? "null"}`
        )
      );
    });
  });
}

function areChildStreamsSettled(child) {
  const stdoutSettled = child.stdout
    ? child.stdout.destroyed || child.stdout.readableEnded
    : true;
  const stderrSettled = child.stderr
    ? child.stderr.destroyed || child.stderr.readableEnded
    : true;
  return stdoutSettled && stderrSettled;
}

function waitForChildClose(child, timeoutMs) {
  return new Promise((resolve) => {
    if (child.exitCode !== null && areChildStreamsSettled(child)) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => {
      child.off("close", onClose);
      resolve(false);
    }, timeoutMs);

    const onClose = () => {
      clearTimeout(timer);
      resolve(true);
    };

    child.once("close", onClose);
  });
}

async function waitForServer(url, server, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(`Dev server exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000)
      });
      if (response.status < 500) {
        return;
      }
    } catch {}

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function buildTestEnv(product, baseUrl) {
  const env = {
    ...process.env,
    APP_BASE_URL: baseUrl,
    PRODUCT: product
  };

  if (product === "nucleum") {
    env.APP_BASE_URL_NUCLEUM = baseUrl;
    env.APP_BASE_URL_NUCLEUS = baseUrl;
    return env;
  }

  env[`APP_BASE_URL_${product.toUpperCase()}`] = baseUrl;
  return env;
}

async function stopServer(server) {
  if (!server) {
    return;
  }

  const killServer = async (signal) => {
    if (!server.pid) {
      return;
    }

    if (process.platform === "win32") {
      const args = ["/pid", String(server.pid), "/T"];
      if (signal === "SIGKILL") {
        args.push("/F");
      }
      try {
        await run("taskkill", args, {
          cwd: repoRoot,
          env: process.env
        });
      } catch {}
      return;
    }

    try {
      process.kill(-server.pid, signal);
    } catch {
      try {
        server.kill(signal);
      } catch {}
    }
  };

  await killServer("SIGTERM");

  let exited = await waitForChildClose(server, 10_000);

  if (!exited) {
    await killServer("SIGKILL");
    exited = await waitForChildClose(server, 5_000);
  }

  if (!exited) {
    server.stdout?.destroy();
    server.stderr?.destroy();
  }
}

async function maybeSaveAuthState(env) {
  const email = process.env.E2E_LOGIN_EMAIL?.trim();
  const password = process.env.E2E_LOGIN_PASSWORD?.trim();

  if (!email || !password) {
    console.log(
      "[playwright-ci] E2E auth secrets are not set; skipping auth state save."
    );
    return;
  }

  try {
    await run("npx", ["tsx", "scripts/save-email-auth-state.ts"], {
      cwd: e2eRoot,
      env
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[playwright-ci] Auth state save failed, continuing without saved auth: ${message}`
    );
  }
}

async function main() {
  const args = validateArgs(parseArgs(process.argv.slice(2)));
  const baseUrl = args.baseUrl ?? `http://127.0.0.1:${args.port}`;
  const upstreamUrl = `http://127.0.0.1:${args.port}`;
  const env = buildTestEnv(args.product, baseUrl);
  const grep = args.suite === "smoke" ? "@smoke" : "@regression";
  const server = spawnLogged(
    "npm",
    [
      "run",
      "dev",
      `--workspace=${args.workspace}`,
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(args.port)
    ],
    {
      cwd: repoRoot,
      detached: process.platform !== "win32",
      env: process.env
    }
  );

  try {
    await waitForServer(upstreamUrl, server);
    await maybeSaveAuthState(env);
    await run(
      "npx",
      ["playwright", "test", `--project=${args.product}`, `--grep=${grep}`],
      {
        cwd: e2eRoot,
        env
      }
    );
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exit(1);
});
