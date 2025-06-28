import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi
} from "vitest";
import { log } from "../../logger";
import { DatabaseProviderFactory } from "$lib/server/database/providers";
import { IActivity } from "../account/account.type";

describe("log function - Integration Tests", () => {
  let originalProvider: string | undefined;

  beforeAll(() => {
    // Store original DB_PROVIDER for restoration
    originalProvider = process.env.DB_PROVIDER;
  });

  afterAll(() => {
    // Restore original DB_PROVIDER
    if (originalProvider) {
      process.env.DB_PROVIDER = originalProvider;
    } else {
      delete process.env.DB_PROVIDER;
    }
    // Reset provider instance
    DatabaseProviderFactory.resetProvider();
  });

  beforeEach(() => {
    // Reset provider instance before each test
    DatabaseProviderFactory.resetProvider();
  });

  describe.skip("with Surreal database provider", () => {
    beforeEach(() => {
      process.env.DB_PROVIDER = "surreal";
    });

    it("should successfully log user activity", async () => {
      const userId = "test-user-123";
      const activity: IActivity = {
        activity: "user_login"
      };

      const result = await log(userId, activity);

      expect(result).toBeDefined();
      // The result structure will depend on the Surreal provider implementation
      // but we expect it to be successful
    });

    it("should handle complex activity data", async () => {
      const userId = "test-user-456";
      const activity: IActivity = {
        activity: "page_navigation"
      };

      const result = await log(userId, activity);

      expect(result).toBeDefined();
    });

    it("should handle empty userId gracefully", async () => {
      const userId = "";
      const activity: IActivity = {
        activity: "test_activity"
      };

      // Depending on the implementation, this might throw or return an error
      await expect(async () => {
        await log(userId, activity);
      }).rejects.toThrow();
    });
  });

  describe("with DynamoDB database provider", () => {
    beforeEach(() => {
      process.env.DB_PROVIDER = "dynamodb";
    });

    it("should successfully log user activity with DynamoDB", async () => {
      const userId = "dynamo-test-user-123";
      const activity: IActivity = {
        activity: "user_signup"
      };

      const result = await log(userId, activity);
      console.log({ result });
      expect(result).toBeDefined();
      // The result structure will depend on the DynamoDB provider implementation
    });

    it("should handle multiple rapid log calls", async () => {
      const userId = "dynamo-test-user-456";
      const activities: IActivity[] = [
        { activity: "login" },
        { activity: "view_dashboard" },
        { activity: "logout" }
      ];

      const promises = activities.map((activity) => log(userId, activity));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });

  describe.skip("error handling", () => {
    it("should handle database provider errors", async () => {
      // Mock the provider to throw an error
      const mockProvider = {
        log: vi.fn().mockRejectedValue(new Error("Database connection failed"))
      };

      vi.spyOn(DatabaseProviderFactory, "getProvider").mockReturnValue(
        mockProvider as any
      );

      const userId = "error-test-user";
      const activity: IActivity = {
        activity: "test_error"
      };

      await expect(log(userId, activity)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle invalid activity data", async () => {
      const userId = "test-user-789";
      const invalidActivity = null as any;

      await expect(async () => {
        await log(userId, invalidActivity);
      }).rejects.toThrow();
    });
  });

  describe.skip("provider factory integration", () => {
    it("should use the correct provider based on environment", () => {
      process.env.DB_PROVIDER = "surreal";
      DatabaseProviderFactory.resetProvider();

      const provider = DatabaseProviderFactory.getProvider();
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toContain("Surreal");
    });

    it("should default to Surreal when no provider specified", () => {
      delete process.env.DB_PROVIDER;
      DatabaseProviderFactory.resetProvider();

      const provider = DatabaseProviderFactory.getProvider();
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toContain("Surreal");
    });

    it("should return the same provider instance on multiple calls", () => {
      const provider1 = DatabaseProviderFactory.getProvider();
      const provider2 = DatabaseProviderFactory.getProvider();

      expect(provider1).toBe(provider2);
    });
  });

  describe("real-world scenarios", () => {
    it("should log user authentication events", async () => {
      const userId = "auth-test-user";
      const loginActivity: IActivity = {
        activity: "user_authentication_success"
      };

      const result = await log(userId, loginActivity);
      expect(result).toBeDefined();
    });

    it("should log user action events", async () => {
      const userId = "action-test-user";
      const actionActivity: IActivity = {
        activity: "document_created"
      };

      const result = await log(userId, actionActivity);
      expect(result).toBeDefined();
    });

    it("should handle concurrent logging from different users", async () => {
      const users = ["user1", "user2", "user3"];
      const activity: IActivity = {
        activity: "concurrent_test"
      };

      const promises = users.map((userId) => log(userId, activity));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });
});
