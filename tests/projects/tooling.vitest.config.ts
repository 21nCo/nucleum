import { defineConfig } from "vitest/config";

import { alias, basePlugins, baseSetupFile, coverageConfig, repoRoot } from "../vitest.base";

export default defineConfig({
  root: repoRoot,
  plugins: basePlugins,
  resolve: { alias },
  test: {
    dir: repoRoot,
    globals: true,
    environment: "node",
    name: "tooling",
    setupFiles: [baseSetupFile],
    include: ["tests/unit/**/*.spec.ts"],
    coverage: coverageConfig("tooling")
  }
});
