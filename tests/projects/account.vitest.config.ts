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
    name: "account",
    setupFiles: [baseSetupFile],
    include: ["services/account/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.turbo/**", "**/dist/**"],
    coverage: coverageConfig("account")
  }
});
