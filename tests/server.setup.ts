import { afterAll, beforeAll } from "vitest";
import { setupTestEnvironment } from "./server.env";
import { Agent } from "$lib/server/types/account.type";

declare global {
  var testEnv: {
    agent: Agent;
    isDev: boolean;
    cleanup: () => Promise<void>;
  };
}

beforeAll(async () => {
  const environment = setupTestEnvironment();
  process.env.DB_USER = "system";
  process.env.DOMAIN = environment.domain;
  global.testEnv = {
    ...environment,
    cleanup: async () => {
      // Environment-specific cleanup
    }
  };
});

afterAll(async () => {
  // Cleanup after all tests
  await global.testEnv.cleanup();
});
