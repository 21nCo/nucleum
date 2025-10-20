import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const INDEX_CANDIDATES = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.mjs",
  "index.cjs",
  "index.svelte",
  "index.d.ts",
  "src/index.ts",
  "src/index.tsx",
  "src/index.js",
  "src/index.mjs",
  "src/index.cjs",
  "src/index.svelte",
  "src/index.d.ts"
];

const ALIAS_MAP_PATH = path.join(__dirname, "alias-map.json");

const toPosixPath = (value) => value.replace(/\\/g, "/");

const ensureRelativeSpecifier = (value) => {
  if (value === "." || value.startsWith(".") || value.startsWith("/")) {
    return value;
  }

  return `./${value}`;
};

export const loadAliasMap = () => {
  const raw = readFileSync(ALIAS_MAP_PATH, "utf8");
  return JSON.parse(raw);
};

export const buildTsconfigPaths = (aliasMap, baseDir = PROJECT_ROOT) => {
  const paths = {};

  for (const [alias, target] of Object.entries(aliasMap)) {
    const absoluteTarget = path.resolve(PROJECT_ROOT, target);
    const relativeTarget = path.relative(baseDir, absoluteTarget) || ".";
    const normalizedTarget = ensureRelativeSpecifier(
      toPosixPath(relativeTarget)
    );
    const baseEntries = new Set();

    for (const candidate of INDEX_CANDIDATES) {
      baseEntries.add(`${normalizedTarget}/${candidate}`);
    }

    baseEntries.add(normalizedTarget);

    paths[alias] = Array.from(baseEntries);
    const wildcardTarget = ensureRelativeSpecifier(
      toPosixPath(path.join(relativeTarget, "*"))
    );

    paths[`${alias}/*`] = [wildcardTarget];
  }

  return paths;
};

export const buildViteAliases = (aliasMap, projectRoot = PROJECT_ROOT) => {
  return Object.fromEntries(
    Object.entries(aliasMap).map(([alias, target]) => [
      alias,
      path.resolve(projectRoot, target)
    ])
  );
};

export const getAliasEntries = () => {
  const aliasMap = loadAliasMap();
  return {
    aliasMap,
    tsconfigPaths: buildTsconfigPaths(aliasMap),
    viteAliases: buildViteAliases(aliasMap)
  };
};

export const DISALLOWED_IMPORT_PATTERNS = [
  /^\.\.{1,2}\//, // relative traversals
  /^client\//,
  /^apps\//,
  /^shared\//,
  /^\$lib\//,
  /^\$lib$/
];

export const isAliasPath = (value, aliasMap = loadAliasMap()) => {
  return Object.keys(aliasMap).some((alias) =>
    value === alias || value.startsWith(`${alias}/`)
  );
};

export const isDisallowedImport = (value) => {
  return DISALLOWED_IMPORT_PATTERNS.some((pattern) => pattern.test(value));
};
