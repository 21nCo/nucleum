import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildCoverageMatrixRows,
  renderCoverageMatrixJson,
  renderCoverageMatrixMarkdown
} from "../tests/utils/coverage";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const artifactsDir = path.resolve(repoRoot, "apps/e2e-playwright/artifacts");
const markdownPath = path.resolve(artifactsDir, "coverage-matrix.md");
const jsonPath = path.resolve(artifactsDir, "coverage-matrix.json");

mkdirSync(artifactsDir, { recursive: true });

const rows = buildCoverageMatrixRows();

writeFileSync(markdownPath, renderCoverageMatrixMarkdown(rows));
writeFileSync(jsonPath, renderCoverageMatrixJson(rows));

console.log(`Wrote ${path.relative(repoRoot, markdownPath)}`);
console.log(`Wrote ${path.relative(repoRoot, jsonPath)}`);
