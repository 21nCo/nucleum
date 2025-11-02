import { beforeAll } from "vitest";

const defaultEnv: Record<string, string> = {
  TURSO_BASE_URL: "http://localhost:8080",
  TURSO_AUTH_TOKEN: "test-token",
  LINEAR_WEBHOOK_SECRET: "test-secret",
  LINEAR_API_KEY: "test-linear-key",
  WORKSPACE_DATABASE_URL: "file:workspace.db",
  WORKSPACE_DATABASE_TOKEN: "workspace-token"
};

beforeAll(() => {
  for (const [key, value] of Object.entries(defaultEnv)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
});
