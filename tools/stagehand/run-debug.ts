import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Stagehand } from "@browserbasehq/stagehand";

type Product = "nucleus" | "memotron" | "pointron";
type Flow = "home" | "capture-markdown" | "custom";

interface CliOptions {
  product: Product;
  flow: Flow;
  url?: string;
  prompt?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "../..");
const stagehandLogRoot = join(repoRoot, ".logs", "stagehand");
const configDir = process.env.BROWSERBASE_CONFIG_DIR
  ? resolve(process.env.BROWSERBASE_CONFIG_DIR)
  : join(stagehandLogRoot, "browserbase");

process.env.BROWSERBASE_CONFIG_DIR = configDir;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    product: "nucleus",
    flow: "capture-markdown"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--product" && next) {
      if (next === "nucleus" || next === "memotron" || next === "pointron") {
        options.product = next;
      }
      i += 1;
      continue;
    }
    if (arg === "--flow" && next) {
      if (next === "home" || next === "capture-markdown" || next === "custom") {
        options.flow = next;
      }
      i += 1;
      continue;
    }
    if (arg === "--url" && next) {
      options.url = next;
      i += 1;
      continue;
    }
    if (arg === "--prompt" && next) {
      options.prompt = next;
      i += 1;
    }
  }

  return options;
}

function resolveDefaultUrl(product: Product) {
  switch (product) {
    case "memotron":
      return process.env.STAGEHAND_URL_MEMOTRON ?? "http://127.0.0.1:5002";
    case "pointron":
      return process.env.STAGEHAND_URL_POINTRON ?? "http://127.0.0.1:5001";
    case "nucleus":
    default:
      return process.env.STAGEHAND_URL_NUCLEUS ?? "http://127.0.0.1:5050";
  }
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function flushAppLogs(page: any) {
  try {
    return await page.evaluate(async () => {
      const win = window as unknown as Record<string, unknown>;
      const flush = win.__flushDevLogs;
      const get = win.__getDevLogs;
      if (typeof flush === "function") {
        await flush();
      }
      if (typeof get === "function") {
        return get();
      }
      return "";
    });
  } catch (error) {
    return `Failed to flush app logs: ${String(error)}`;
  }
}

async function saveArtifacts(runId: string, payload: Record<string, unknown>) {
  await ensureDir(stagehandLogRoot);
  const path = join(stagehandLogRoot, `${runId}.json`);
  await writeFile(path, JSON.stringify(payload, null, 2), "utf8");
  return path;
}

async function runHomeFlow(stagehand: Stagehand, page: any) {
  await stagehand.observe("List the primary actions available on the current app shell.");
  await page.waitForTimeout(1500);
}

async function runCaptureMarkdownFlow(stagehand: Stagehand, page: any, product: Product) {
  if (product !== "nucleus") {
    throw new Error("capture-markdown flow is currently scoped to nucleus");
  }

  await stagehand.act("Open a new capture surface.");
  await page.waitForTimeout(500);
  await stagehand.act("Type 'Stagehand Debug Title' into the capture title field.");
  await stagehand.act("Type 'Stagehand body line one' into the first markdown block.");
  await stagehand.act("Type a second line into the same markdown body.");
  await page.waitForTimeout(1500);
  await stagehand.act("Save the capture.");
  await page.waitForTimeout(2500);
}

async function runCustomFlow(stagehand: Stagehand, prompt?: string) {
  if (!prompt) {
    throw new Error("custom flow requires --prompt");
  }
  await stagehand.agent().execute(prompt);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = options.url ?? resolveDefaultUrl(options.product);
  const runId = `${timestamp()}-${options.product}-${options.flow}`;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required for Stagehand AI operations. Export it in this shell and rerun the Stagehand debug command."
    );
  }

  await ensureDir(stagehandLogRoot);

  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: (Number(process.env.STAGEHAND_VERBOSE ?? "1") === 2
      ? 2
      : Number(process.env.STAGEHAND_VERBOSE ?? "1") === 0
        ? 0
        : 1) as 0 | 1 | 2,
    logInferenceToFile: process.env.STAGEHAND_LOG_INFERENCE === "true",
    localBrowserLaunchOptions: {
      headless: process.env.STAGEHAND_HEADLESS === "true",
      devtools: process.env.STAGEHAND_DEVTOOLS === "true",
      viewport: { width: 1440, height: 960 }
    }
  });

  await stagehand.init();
  const page = stagehand.context.pages()[0];
  const pageAny: any = page;

  const consoleEvents: Array<Record<string, unknown>> = [];
  pageAny.on("console", (message: any) => {
    consoleEvents.push({
      type: message.type?.(),
      text: message.text?.()
    });
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    if (options.flow === "home") {
      await runHomeFlow(stagehand, page);
    } else if (options.flow === "capture-markdown") {
      await runCaptureMarkdownFlow(stagehand, page, options.product);
    } else {
      await runCustomFlow(stagehand, options.prompt);
    }

    const appLogs = await flushAppLogs(page);
    const history = await stagehand.history;
    const metrics = await stagehand.metrics;
    const artifactPath = await saveArtifacts(runId, {
      runId,
      product: options.product,
      flow: options.flow,
      url,
      appLogs,
      consoleEvents,
      history,
      metrics,
      browserbaseConfigDir: configDir
    });

    console.log(JSON.stringify({
      runId,
      artifactPath,
      browserbaseConfigDir: configDir,
      appLogFile: join(repoRoot, ".logs", "client-console.log"),
      appLogNdjsonFile: join(repoRoot, ".logs", "client-console.ndjson")
    }, null, 2));
  } finally {
    await stagehand.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
