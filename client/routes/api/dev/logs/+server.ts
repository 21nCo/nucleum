import { DEV } from "$app/environment";
import { json } from "@sveltejs/kit";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

type LogLevel = "log" | "warn" | "error" | "unhandledrejection" | "windowerror";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  product?: string;
  href: string;
  path: string;
  args: unknown[];
}

function stringifyArg(arg: unknown) {
  return typeof arg === "string" ? arg : JSON.stringify(arg);
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("local.")
  );
}

export async function POST({ request, url }) {
  if (!DEV && !isLocalHost(url.hostname)) {
    return json({ ok: false }, { status: 404 });
  }

  const payload = await request.json().catch(() => undefined);
  const entries = Array.isArray(payload?.entries) ? (payload.entries as LogEntry[]) : [];
  if (entries.length === 0) {
    return json({ ok: true, written: 0 });
  }

  const logsDir = join(process.cwd(), ".logs");
  const textPath = join(logsDir, "client-console.log");
  const ndjsonPath = join(logsDir, "client-console.ndjson");

  await mkdir(logsDir, { recursive: true });

  const text = entries
    .map((entry) => {
      return `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.product ?? "unknown"} ${entry.path} ${entry.args
        .map(stringifyArg)
        .join(" ")}`;
    })
    .join("\n")
    .concat("\n");

  const ndjson = entries
    .map((entry) => JSON.stringify(entry))
    .join("\n")
    .concat("\n");

  await appendFile(textPath, text, "utf8");
  await appendFile(ndjsonPath, ndjson, "utf8");

  return json({ ok: true, written: entries.length });
}
