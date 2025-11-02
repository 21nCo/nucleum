import path from "node:path";

import { defineConfig } from "vitest/config";

import {
  alias,
  baseSetupFile,
  clientPlugins,
  coverageConfig,
  repoRoot
} from "../vitest.base";

export default defineConfig({
  root: repoRoot,
  plugins: clientPlugins,
  resolve: { alias },
  test: {
    dir: repoRoot,
    globals: true,
    environment: "jsdom",
    name: "client",
    setupFiles: [
      baseSetupFile,
      path.join(__dirname, "../client/setup.ts")
    ],
    include: [
      "client/**/*.test.ts",
      "client/**/*.test.tsx",
      "client/**/*.test.svelte",
      "client/**/*.spec.ts",
      "client/**/*.spec.svelte"
    ],
    exclude: ["**/node_modules/**", "**/.turbo/**", "**/dist/**"],
    coverage: coverageConfig("client")
  }
});
