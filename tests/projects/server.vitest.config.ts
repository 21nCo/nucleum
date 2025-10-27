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
    name: "server",
    setupFiles: [baseSetupFile, path.join(__dirname, "../server/setup.ts")],
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/.turbo/**", "**/dist/**"],
    coverage: coverageConfig("server")
  }
});
