import path from "node:path";

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
    name: "integration",
    setupFiles: [
      baseSetupFile,
      path.join(__dirname, "../integration/setup.ts")
    ],
    include: ["tests/integration/**/*.spec.ts"],
    coverage: coverageConfig("integration")
  }
});
