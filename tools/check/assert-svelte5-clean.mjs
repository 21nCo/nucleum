#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const RG_COMMAND = process.platform === "win32" ? "rg.exe" : "rg";
const DEFAULT_SCOPES = [
  "apps/nucleus",
  "apps/memotron",
  "apps/pointron",
  "apps/timear",
  "client",
  "extensions/memotron-share",
];
const SUPPORTED_MODES = new Set(["baseline", "final"]);
const IGNORED_GLOBS = [
  "!**/node_modules/**",
  "!**/.svelte-kit/**",
  "!**/dist/**",
  "!**/build/**",
  "!**/.turbo/**",
];
const CONSTRUCTS = [
  {
    key: "export let",
    pattern: "export let",
    isFixed: true,
  },
  {
    key: "$$props",
    pattern: "$$props",
    isFixed: true,
  },
  {
    key: "$$restProps",
    pattern: "$$restProps",
    isFixed: true,
  },
  {
    key: "reactive $:",
    pattern: "^\\s*\\$:",
    isFixed: false,
  },
  {
    key: "createEventDispatcher",
    pattern: "createEventDispatcher",
    isFixed: true,
  },
  {
    key: "on:",
    pattern: "\\bon:[A-Za-z_][\\w:-]*",
    isFixed: false,
  },
  {
    key: "<slot",
    pattern: "<slot",
    isFixed: true,
  },
  {
    key: "slot=\"...\"",
    pattern: "slot=\"",
    isFixed: true,
  },
  {
    key: "$$slots",
    pattern: "$$slots",
    isFixed: true,
  },
  {
    key: "let:",
    pattern: "\\blet:[A-Za-z_][\\w-]*",
    isFixed: false,
  },
  {
    key: "<svelte:component",
    pattern: "<svelte:component",
    isFixed: true,
  },
  {
    key: "afterUpdate",
    pattern: "afterUpdate",
    isFixed: true,
  },
  {
    key: "accessors={true}",
    pattern: "accessors={true}",
    isFixed: true,
  },
  {
    key: "export let children",
    pattern: "export let children",
    isFixed: true,
  },
];

function printUsageAndExit(message) {
  if (message) {
    console.error(message);
  }
  console.error(
    "Usage: node tools/check/assert-svelte5-clean.mjs --mode=baseline|final [--scope=<path>]...",
  );
  process.exit(1);
}

function parseArgs(argv) {
  let mode;
  const scopes = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--mode") {
      index += 1;
      if (index >= argv.length) {
        printUsageAndExit("Missing value for --mode");
      }
      mode = argv[index];
      continue;
    }

    if (argument.startsWith("--mode=")) {
      mode = argument.slice("--mode=".length);
      continue;
    }

    if (argument === "--scope") {
      index += 1;
      if (index >= argv.length) {
        printUsageAndExit("Missing value for --scope");
      }
      scopes.push(argv[index]);
      continue;
    }

    if (argument.startsWith("--scope=")) {
      scopes.push(argument.slice("--scope=".length));
      continue;
    }

    printUsageAndExit(`Unsupported argument: ${argument}`);
  }

  if (!SUPPORTED_MODES.has(mode)) {
    printUsageAndExit("Mode must be baseline or final");
  }

  return {
    mode,
    scopes: scopes.length === 0 ? DEFAULT_SCOPES : scopes.flatMap((scope) => scope.split(",")),
  };
}

function toRepoPath(value) {
  return path.relative(REPO_ROOT, value).split(path.sep).join("/");
}

function resolveScopes(scopeValues) {
  return scopeValues.map((scopeValue) => {
    const trimmed = scopeValue.trim();
    if (!trimmed) {
      printUsageAndExit("Empty scope is not allowed");
    }

    const absolutePath = path.resolve(REPO_ROOT, trimmed);
    const relativePath = toRepoPath(absolutePath);

    if (
      relativePath.startsWith("..") ||
      path.isAbsolute(trimmed)
    ) {
      printUsageAndExit(`Scope must remain inside repo root: ${trimmed}`);
    }

    return {
      absolutePath,
      relativePath,
    };
  });
}

function runRipgrepCount({ pattern, isFixed, scopePaths }) {
  const args = ["-o", ...(isFixed ? ["-F"] : ["-P"]), pattern];

  for (const glob of IGNORED_GLOBS) {
    args.push("--glob", glob);
  }

  args.push(...scopePaths);

  const child = spawnSync(RG_COMMAND, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024 * 64,
  });

  if (child.error) {
    throw child.error;
  }

  if (![0, 1].includes(child.status ?? 1)) {
    throw new Error((child.stderr || child.stdout || "ripgrep failed").trim());
  }

  if (!child.stdout) {
    return 0;
  }

  return child.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function main() {
  const { mode, scopes } = parseArgs(process.argv.slice(2));
  const resolvedScopes = resolveScopes(scopes);
  const scopePaths = resolvedScopes.map((scope) => scope.relativePath);
  const results = CONSTRUCTS.map((construct) => ({
    key: construct.key,
    count: runRipgrepCount({
      pattern: construct.pattern,
      isFixed: construct.isFixed,
      scopePaths,
    }),
  }));
  const nonZeroResults = results.filter((result) => result.count > 0);

  console.log(`mode=${mode}`);
  console.log(`scopes=${scopePaths.join(",")}`);

  for (const result of results) {
    console.log(`construct=${result.key} count=${result.count}`);
  }

  console.log(`nonZeroConstructs=${nonZeroResults.length}`);

  if (mode === "baseline") {
    console.log("status=baseline");
    process.exit(0);
  }

  if (nonZeroResults.length > 0) {
    console.log("status=failed");
    process.exit(1);
  }

  console.log("status=passed");
}

main();
