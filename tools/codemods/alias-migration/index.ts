#!/usr/bin/env node
import { readFileSync, statSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, ScriptKind, SyntaxKind, Node, ts } from "ts-morph";

type AliasMap = Record<string, string>;

type AliasEntry = {
  alias: string;
  absolutePath: string;
  relativePath: string;
};

type TransformKind = "import" | "export" | "require" | "dynamicImport";

type UnmappedSpecifier = {
  file: string;
  specifier: string;
  reason: string;
  line?: number;
  kind: TransformKind;
};

type TransformStats = {
  updated: number;
  unmapped: UnmappedSpecifier[];
};

export interface CodemodOptions {
  paths: string[];
  dryRun?: boolean;
  aliasMapPath?: string;
  failOnUnmapped?: boolean;
  verbose?: boolean;
  libRoot?: string;
}

export interface CodemodSummary {
  filesProcessed: number;
  filesChanged: number;
  specifiersUpdated: number;
  unmapped: UnmappedSpecifier[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

const DEFAULT_TARGET_PATHS = ["client", "shared", "apps", "extensions"];

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".svelte-kit",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".output",
  ".next"
]);

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".svelte"
]);

const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: {
    allowJs: true,
    allowSyntheticDefaultImports: true,
    target: ts.ScriptTarget.ES2020
  }
});

const toPosix = (value: string) => value.replace(/\\/g, "/");

const loadAliasEntries = (aliasMapPath?: string): AliasEntry[] => {
  const mapFilePath = aliasMapPath
    ? path.resolve(PROJECT_ROOT, aliasMapPath)
    : path.resolve(PROJECT_ROOT, "tools/alias-map.json");

  const aliasMap: AliasMap = JSON.parse(readFileSync(mapFilePath, "utf8"));

  return Object.entries(aliasMap).map(([alias, relativePath]) => {
    const absolutePath = path.resolve(PROJECT_ROOT, relativePath);
    return { alias, relativePath, absolutePath };
  });
};

const findAliasForPath = (aliasEntries: AliasEntry[], absoluteTarget: string) => {
  let bestMatch: AliasEntry | undefined;

  for (const entry of aliasEntries) {
    if (
      absoluteTarget === entry.absolutePath ||
      absoluteTarget.startsWith(`${entry.absolutePath}${path.sep}`)
    ) {
      if (!bestMatch || entry.absolutePath.length > bestMatch.absolutePath.length) {
        bestMatch = entry;
      }
    }
  }

  return bestMatch;
};

const isAliasSpecifier = (spec: string, aliasEntries: AliasEntry[]) => {
  return aliasEntries.some((entry) => spec === entry.alias || spec.startsWith(`${entry.alias}/`));
};

const resolveAbsoluteFromSpecifier = (
  specifier: string,
  filePath: string,
  libRoot: string
) => {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return path.resolve(path.dirname(filePath), specifier);
  }

  if (specifier.startsWith("$lib/")) {
    const remainder = specifier.slice(5);
    if (!remainder) {
      return path.resolve(PROJECT_ROOT, libRoot);
    }
    return path.resolve(PROJECT_ROOT, libRoot, remainder);
  }

  if (specifier === "$lib") {
    return path.resolve(PROJECT_ROOT, libRoot);
  }

  if (specifier.startsWith("/")) {
    return path.resolve(PROJECT_ROOT, specifier.slice(1));
  }

  if (
    specifier.startsWith("client/") ||
    specifier.startsWith("apps/") ||
    specifier.startsWith("extensions/") ||
    specifier.startsWith("shared/")
  ) {
    return path.resolve(PROJECT_ROOT, specifier);
  }

  return null;
};

const buildAliasSpecifier = (entry: AliasEntry, absoluteTarget: string) => {
  const relative = path.relative(entry.absolutePath, absoluteTarget);
  if (relative.startsWith("..")) {
    return null;
  }

  const normalized = toPosix(relative);
  return normalized && normalized !== ""
    ? `${entry.alias}/${normalized.replace(/^\.\//, "")}`
    : entry.alias;
};

const determineScriptKind = (filePath: string): ScriptKind => {
  const ext = path.extname(filePath);

  switch (ext) {
    case ".ts":
      return ScriptKind.TS;
    case ".tsx":
      return ScriptKind.TSX;
    case ".jsx":
      return ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ScriptKind.JS;
    case ".mts":
      return ScriptKind.MTS;
    case ".cts":
      return ScriptKind.CTS;
    default:
      return ScriptKind.TS;
  }
};

const transformModuleSource = (
  sourceText: string,
  sourceFilePath: string,
  resolveBasePath: string,
  aliasEntries: AliasEntry[],
  stats: TransformStats,
  scriptKind: ScriptKind,
  libRoot: string
) => {
  const sourceFile = project.createSourceFile(sourceFilePath, sourceText, {
    overwrite: true,
    scriptKind
  });

  let changed = false;

  const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);

  for (const literal of stringLiterals) {
    const parent = literal.getParent();
    const specifier = literal.getLiteralValue();

    if (!specifier || isAliasSpecifier(specifier, aliasEntries)) {
      continue;
    }

    const isRequireCall =
      Node.isCallExpression(parent) && parent.getExpression().getText() === "require";
    const isDynamicImport =
      Node.isCallExpression(parent) &&
      parent.getExpression().getKind() === SyntaxKind.ImportKeyword;

    const isImportLike =
      Node.isImportDeclaration(parent) ||
      Node.isExportDeclaration(parent) ||
      isRequireCall ||
      isDynamicImport;

    if (!isImportLike) {
      continue;
    }

    const absoluteTarget = resolveAbsoluteFromSpecifier(specifier, resolveBasePath, libRoot);

    if (!absoluteTarget) {
      continue;
    }

    const aliasEntry = findAliasForPath(aliasEntries, absoluteTarget);

    const transformKind: TransformKind = Node.isImportDeclaration(parent)
      ? "import"
      : Node.isExportDeclaration(parent)
        ? "export"
        : isRequireCall
          ? "require"
          : "dynamicImport";

    if (!aliasEntry) {
      stats.unmapped.push({
        file: resolveBasePath,
        specifier,
        reason: "no-alias-match",
        line: literal.getStartLineNumber(),
        kind: transformKind
      });
      continue;
    }

    const nextSpecifier = buildAliasSpecifier(aliasEntry, absoluteTarget);

    if (!nextSpecifier || nextSpecifier === specifier) {
      continue;
    }

    literal.setLiteralValue(nextSpecifier);
    stats.updated += 1;
    changed = true;
  }

  const output = sourceFile.getFullText();
  project.removeSourceFile(sourceFile);
  return { changed, output };
};

const transformSvelteFile = (
  filePath: string,
  content: string,
  aliasEntries: AliasEntry[],
  stats: TransformStats,
  libRoot: string
) => {
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let transformed = "";
  let changed = false;
  let scriptIndex = 0;

  while ((match = scriptRegex.exec(content)) !== null) {
    const [fullMatch, rawAttrs, scriptBody] = match;
    const start = match.index;
    const end = start + fullMatch.length;
    const attrs = rawAttrs ?? "";
    const isTypeScript = /lang\s*=\s*['"](?:ts|typescript)['"]/i.test(attrs);
    const virtualPath = `${filePath}__script_${scriptIndex}.${isTypeScript ? "ts" : "js"}`;

    const { changed: scriptChanged, output } = transformModuleSource(
      scriptBody,
      virtualPath,
      filePath,
      aliasEntries,
      stats,
      isTypeScript ? ScriptKind.TS : ScriptKind.JS,
      libRoot
    );

    if (scriptChanged) {
      changed = true;
    }

    const openingTag = `<script${attrs}>`;
    const closingTag = "</script>";

    transformed += content.slice(lastIndex, start);
    transformed += `${openingTag}${output}${closingTag}`;
    lastIndex = end;
    scriptIndex += 1;
  }

  if (lastIndex === 0) {
    return { changed: false, output: content };
  }

  transformed += content.slice(lastIndex);
  return { changed, output: transformed };
};

const processFile = (
  filePath: string,
  aliasEntries: AliasEntry[],
  stats: TransformStats,
  libRoot: string
) => {
  const ext = path.extname(filePath);
  const content = readFileSync(filePath, "utf8");

  if (ext === ".svelte") {
    return transformSvelteFile(filePath, content, aliasEntries, stats, libRoot);
  }

  return transformModuleSource(
    content,
    filePath,
    filePath,
    aliasEntries,
    stats,
    determineScriptKind(filePath),
    libRoot
  );
};

const shouldProcessFile = (filePath: string) => {
  const ext = path.extname(filePath);
  return SUPPORTED_EXTENSIONS.has(ext);
};

const walkDirectory = (rootPath: string): string[] => {
  const stack = [rootPath];
  const files: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const stats = statSync(current);

    if (stats.isDirectory()) {
      const dirName = path.basename(current);
      if (IGNORED_DIRECTORIES.has(dirName)) {
        continue;
      }

      const entries = readdirSync(current);
      for (const entry of entries) {
        stack.push(path.join(current, entry));
      }
    } else if (stats.isFile() && shouldProcessFile(current)) {
      files.push(current);
    }
  }

  return files;
};

export const runCodemod = (options: CodemodOptions): CodemodSummary => {
  const aliasEntries = loadAliasEntries(options.aliasMapPath);
  const targetPaths = options.paths.length > 0 ? options.paths : DEFAULT_TARGET_PATHS;
  const absoluteTargets = targetPaths.map((p) => path.resolve(PROJECT_ROOT, p));
  const libRoot = options.libRoot ?? ".";

  const stats: TransformStats = {
    updated: 0,
    unmapped: []
  };

  let filesProcessed = 0;
  let filesChanged = 0;

  for (const target of absoluteTargets) {
    if (!target.startsWith(PROJECT_ROOT)) {
      continue;
    }

    let files: string[] = [];
    try {
      files = walkDirectory(target);
    } catch (error) {
      if (options.verbose) {
        console.warn(`Skipping ${target}: ${(error as Error).message}`);
      }
      continue;
    }

    for (const filePath of files) {
      filesProcessed += 1;
      const result = processFile(filePath, aliasEntries, stats, libRoot);

      if (result.changed) {
        filesChanged += 1;
        if (!options.dryRun) {
          writeFileSync(filePath, result.output, "utf8");
        }
      }
    }
  }

  if (options.failOnUnmapped && stats.unmapped.length > 0) {
    const details = stats.unmapped
      .map((item) => `${path.relative(PROJECT_ROOT, item.file)}:${item.line ?? "?"} ${item.specifier}`)
      .join("\n");
    throw new Error(`Codemod encountered unmapped specifiers:\n${details}`);
  }

  return {
    filesProcessed,
    filesChanged,
    specifiersUpdated: stats.updated,
    unmapped: stats.unmapped
  };
};

const formatSummary = (summary: CodemodSummary) => {
  const lines = [
    "Alias migration codemod complete:",
    `  Files processed: ${summary.filesProcessed}`,
    `  Files changed:   ${summary.filesChanged}`,
    `  Specifiers updated: ${summary.specifiersUpdated}`
  ];

  if (summary.unmapped.length > 0) {
    lines.push(`  Unmapped specifiers: ${summary.unmapped.length}`);
    const samples = summary.unmapped.slice(0, 10);
    for (const item of samples) {
      const relPath = path.relative(PROJECT_ROOT, item.file);
      lines.push(`    - ${relPath}:${item.line ?? "?"} -> ${item.specifier} (${item.reason})`);
    }
    if (summary.unmapped.length > samples.length) {
      lines.push(`    ... ${summary.unmapped.length - samples.length} more`);
    }
  }

  return lines.join("\n");
};

const parseArguments = (argv: string[]): CodemodOptions => {
  const options: CodemodOptions = {
    paths: [],
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--fail-on-unmapped":
        options.failOnUnmapped = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--alias-map": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("--alias-map requires a file path");
        }
        options.aliasMapPath = value;
        i += 1;
        break;
      }
      case "--lib-root": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error("--lib-root requires a value");
        }
        options.libRoot = value;
        i += 1;
        break;
      }
      case "--path":
      case "--dir": {
        const value = argv[i + 1];
        if (!value) {
          throw new Error(`${arg} requires a value`);
        }
        options.paths.push(value);
        i += 1;
        break;
      }
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown argument: ${arg}`);
        }
        options.paths.push(arg);
    }
  }

  return options;
};

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const summary = runCodemod(options);
    console.log(formatSummary(summary));
  } catch (error) {
    console.error(`Alias migration codemod failed: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
