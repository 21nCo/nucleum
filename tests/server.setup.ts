import { afterAll, beforeAll } from "vitest";
import { setupTestEnvironment } from "./server.env";
import { Agent } from "$lib/server/common/account/account.type";

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
  process.env.ADMIN_DB_NAME = "admin";
  process.env.ADMIN_NS = "admin";
  process.env.NODE_ENV = "dev";
  process.env.TOKEN_NAME = "tokenone";
  // process.env.DYNAMODB_ACCOUNT_ID = "012509421685";
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
