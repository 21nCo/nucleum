import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".conduct",
  ".git",
  ".svelte-kit",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
  "tmp"
]);
const testFilePattern =
  /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$/;
const sourceFilePattern = /\.[cm]?[jt]sx?$/;
const fixedWaitPatterns = [
  { label: "Playwright waitForTimeout", pattern: /\.waitForTimeout\s*\(/g },
  {
    label: "awaited setTimeout promise",
    pattern:
      /await\s+new\s+Promise(?:<[^>]+>)?\s*\([\s\S]{0,500}?setTimeout\s*\(/g
  },
  { label: "awaited sleep helper", pattern: /await\s+(?:[\w$]+\.)*sleep\s*\(/g }
];

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath, files);
      continue;
    }
    const relativePath = path
      .relative(root, absolutePath)
      .split(path.sep)
      .join("/");
    if (
      sourceFilePattern.test(relativePath) &&
      testFilePattern.test(relativePath)
    ) {
      files.push({ absolutePath, relativePath });
    }
  }
  return files;
}

const violations = [];
for (const file of collectFiles(root)) {
  const source = fs.readFileSync(file.absolutePath, "utf8");
  for (const { label, pattern } of fixedWaitPatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push(`${file.relativePath}:${line}: ${label}`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `Fixed waits are not allowed in tests. Synchronize on an observable condition instead.\n${violations.join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write("No fixed waits found in test files.\n");
}
