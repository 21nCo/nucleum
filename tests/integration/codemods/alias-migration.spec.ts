import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { cpSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCodemod } from "../../../tools/codemods/alias-migration/index";

const TEMPLATE_DIR = path.resolve(
  __dirname,
  "../../fixtures/aliases/template"
);

describe("alias migration codemod", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(
      path.join(TEMPLATE_DIR, "../tmp-alias-codemod-")
    );
    cpSync(TEMPLATE_DIR, tempDir, { recursive: true });

    const aliasMap = {
      "@fixtures/components": path.join(tempDir, "workspace/components"),
      "@fixtures/utils": path.join(tempDir, "workspace/utils")
    } satisfies Record<string, string>;

    writeFileSync(
      path.join(tempDir, "alias-map.json"),
      `${JSON.stringify(aliasMap, null, 2)}\n`
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("rewrites relative, $lib, dynamic import, and require specifiers", () => {
    const summary = runCodemod({
      paths: [path.join(tempDir, "src")],
      aliasMapPath: path.join(tempDir, "alias-map.json"),
      libRoot: path.join(tempDir, "workspace"),
      dryRun: false
    });

    expect(summary.filesProcessed).toBe(2);
    expect(summary.filesChanged).toBe(2);
    expect(summary.specifiersUpdated).toBe(7);
    expect(summary.unmapped).toHaveLength(0);

    const tsFile = readFileSync(path.join(tempDir, "src/example.ts"), "utf8");
    expect(tsFile).toContain(
      'import type { ButtonProps } from "@fixtures/components/Button"'
    );
    expect(tsFile).toContain(
      'import getUserAgent from "@fixtures/utils/browser"'
    );
    expect(tsFile).toContain('import { Button } from "@fixtures/components/Button"');
    expect(tsFile).toContain('await import("@fixtures/utils/browser")');
    expect(tsFile).toContain('require("@fixtures/utils/browser")');

    const svelteFile = readFileSync(path.join(tempDir, "src/example.svelte"), "utf8");
    expect(svelteFile).toContain(
      'import { Button } from "@fixtures/components/Button"'
    );
    expect(svelteFile).toContain(
      'import helper from "@fixtures/utils/browser"'
    );
  });
});
