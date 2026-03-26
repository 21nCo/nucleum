import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTsconfigPaths, loadAliasMap } from "./alias-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TARGET_TSCONFIGS = [
  "tsconfig.json",
  "client/tsconfig.json"
];

const aliasMap = loadAliasMap();

const writeJsonFile = (filePath, json) => {
  const content = `${JSON.stringify(json, null, 2)}\n`;
  writeFileSync(filePath, content, "utf8");
};

const updateTsconfig = (relativePath) => {
  const tsconfigPath = path.resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(tsconfigPath)) {
    return false;
  }

  const current = JSON.parse(readFileSync(tsconfigPath, "utf8"));
  const baseDir = path.dirname(tsconfigPath);
  const tsconfigPaths = buildTsconfigPaths(aliasMap, baseDir);

  const compilerOptions = {
    ...(current.compilerOptions ?? {}),
    paths: tsconfigPaths
  };

  const nextConfig = {
    ...current,
    compilerOptions
  };

  writeJsonFile(tsconfigPath, nextConfig);
  return true;
};

const updated = TARGET_TSCONFIGS.filter(updateTsconfig);

console.log(`Updated ${updated.length} tsconfig files with workspace alias paths.`);
