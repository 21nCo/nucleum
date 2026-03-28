#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const DEFAULT_FORMAT = "json";
const SUPPORTED_FORMATS = new Set(["json", "text"]);
const WORKSPACES = [
  {
    name: "nucleus-app",
    cwd: "apps/nucleus",
    tsconfigPath: "apps/nucleus/tsconfig.json",
  },
  {
    name: "memotron-app",
    cwd: "apps/memotron",
    tsconfigPath: "apps/memotron/tsconfig.json",
  },
  {
    name: "pointron-app",
    cwd: "apps/pointron",
    tsconfigPath: "apps/pointron/tsconfig.json",
  },
  {
    name: "timear",
    cwd: "apps/timear",
    tsconfigPath: "apps/timear/tsconfig.json",
  },
];
const ERROR_CODES = {
  baselineFailed: "CHK_BASELINE_FAILED",
  configRollback: "CHK_CONFIG_ROLLBACK",
  reporterUsage: "CHK_REPORTER_USAGE",
};

function sanitizeMessage(message) {
  return String(message).replace(/\s+/g, " ").trim();
}

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}

function toRepoPath(value) {
  return path.relative(REPO_ROOT, value).split(path.sep).join("/");
}

function buildEnvelope({ status, generatedAt, workspaceOrder, results, errors }) {
  return {
    status,
    generatedAt,
    workspaceOrder,
    results,
    errors,
  };
}

function buildUsageFailure(generatedAt, message) {
  return buildEnvelope({
    status: "failed",
    generatedAt,
    workspaceOrder: [],
    results: [],
    errors: [
      {
        code: ERROR_CODES.reporterUsage,
        message,
      },
    ],
  });
}

function parseArgs(argv) {
  const requestedWorkspaces = [];
  let format = DEFAULT_FORMAT;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--format") {
      index += 1;
      if (index >= argv.length) {
        return {
          error: "Unsupported format",
        };
      }
      format = argv[index];
      continue;
    }

    if (argument.startsWith("--format=")) {
      format = argument.slice("--format=".length);
      continue;
    }

    if (argument === "--workspace") {
      index += 1;
      if (index >= argv.length) {
        return {
          error: "Unsupported workspace",
        };
      }
      requestedWorkspaces.push(argv[index]);
      continue;
    }

    if (argument.startsWith("--workspace=")) {
      requestedWorkspaces.push(argument.slice("--workspace=".length));
      continue;
    }

    return {
      error: `Unsupported argument: ${argument}`,
    };
  }

  if (!SUPPORTED_FORMATS.has(format)) {
    return {
      error: "Unsupported format",
    };
  }

  const requestedWorkspaceSet = new Set(requestedWorkspaces);
  for (const requestedWorkspace of requestedWorkspaceSet) {
    if (!WORKSPACES.some((workspace) => workspace.name === requestedWorkspace)) {
      return {
        error: "Unsupported workspace",
      };
    }
  }

  const selectedWorkspaces =
    requestedWorkspaceSet.size === 0
      ? WORKSPACES
      : WORKSPACES.filter((workspace) => requestedWorkspaceSet.has(workspace.name));

  return {
    format,
    workspaces: selectedWorkspaces,
  };
}

function readJsonFile(repoRelativePath) {
  const absolutePath = path.join(REPO_ROOT, repoRelativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function auditWorkspaceConfigs(workspaces) {
  const errors = [];

  for (const workspace of workspaces) {
    const config = readJsonFile(workspace.tsconfigPath);
    const compilerOptions = config.compilerOptions ?? {};
    const checks = [
      ["strict", compilerOptions.strict],
      ["checkJs", compilerOptions.checkJs],
    ];

    for (const [field, value] of checks) {
      if (value !== true) {
        errors.push({
          code: ERROR_CODES.configRollback,
          workspace: workspace.name,
          path: workspace.tsconfigPath,
          message: `${field} must remain true`,
        });
      }
    }
  }

  return errors;
}

function parseSummaryCounts(output) {
  const normalizedOutput = stripAnsi(output);
  const matches = Array.from(
    normalizedOutput.matchAll(/svelte-check found\s+(\d+)\s+errors?\s+and\s+(\d+)\s+warnings?/gi),
  );

  if (matches.length === 0) {
    return {
      errors: 0,
      warnings: 0,
    };
  }

  const lastMatch = matches.at(-1);

  return {
    errors: Number(lastMatch[1]),
    warnings: Number(lastMatch[2]),
  };
}

function runWorkspaceCheck(workspace) {
  const startedAt = Date.now();
  const child = spawnSync(NPM_COMMAND, ["run", "check", `--workspace=${workspace.name}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024 * 64,
  });
  const durationMs = Date.now() - startedAt;
  const output = `${child.stdout ?? ""}\n${child.stderr ?? ""}`;
  const summary = parseSummaryCounts(output);

  return {
    workspace: workspace.name,
    cwd: workspace.cwd,
    exitCode: child.status ?? 1,
    errors: summary.errors,
    warnings: summary.warnings,
    durationMs,
  };
}

function summarizeFailures(results) {
  return results
    .filter((result) => result.exitCode !== 0)
    .map((result) => ({
      code: ERROR_CODES.baselineFailed,
      workspace: result.workspace,
      path: result.cwd,
      message: "Workspace check failed",
    }));
}

function formatTextEnvelope(envelope) {
  const lines = envelope.results.map((result) => {
    const workspaceStatus = result.exitCode === 0 ? "ok" : "failed";
    return [
      `workspace=${result.workspace}`,
      `cwd=${result.cwd}`,
      `status=${workspaceStatus}`,
      `exitCode=${result.exitCode}`,
      `errors=${result.errors}`,
      `warnings=${result.warnings}`,
      `durationMs=${result.durationMs}`,
    ].join(" ");
  });

  for (const error of envelope.errors) {
    const parts = [`error code=${error.code}`];
    if (error.workspace) {
      parts.push(`workspace=${error.workspace}`);
    }
    if (error.path) {
      parts.push(`path=${error.path}`);
    }
    if (error.message) {
      parts.push(`message=${sanitizeMessage(error.message)}`);
    }
    lines.push(parts.join(" "));
  }

  return lines.join("\n");
}

function printEnvelope(format, envelope) {
  if (format === "text") {
    process.stdout.write(`${formatTextEnvelope(envelope)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}

function main() {
  const generatedAt = new Date().toISOString();
  const parsed = parseArgs(process.argv.slice(2));

  if ("error" in parsed) {
    const envelope = buildUsageFailure(generatedAt, parsed.error);
    printEnvelope(DEFAULT_FORMAT, envelope);
    process.exitCode = 1;
    return;
  }

  const workspaceOrder = parsed.workspaces.map((workspace) => workspace.name);
  const configErrors = auditWorkspaceConfigs(parsed.workspaces);
  const results = parsed.workspaces.map(runWorkspaceCheck);
  const errors = [...configErrors, ...summarizeFailures(results)];
  const hasFailures = errors.length > 0;
  const envelope = buildEnvelope({
    status: hasFailures ? "failed" : "ok",
    generatedAt,
    workspaceOrder,
    results,
    errors,
  });

  printEnvelope(parsed.format, envelope);
  process.exitCode = hasFailures ? 1 : 0;
}

main();
