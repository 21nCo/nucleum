import { describe, it, expect } from "vitest";
import { subscribe } from "./index";
import {
  BillingCycle,
  PlanType,
} from "$lib/client/components/subscription/userPlan.type";
import { ValidationError } from "../../errors";

describe("subscribe", () => {
  it("should throw error when no body is provided", async () => {
    await expect(subscribe(null, global.testEnv.agent)).rejects.toThrow(
      ValidationError
    );
    await expect(subscribe(null, global.testEnv.agent)).rejects.toThrow(
      "No body provided"
    );
  });

  it(
    "should create a new subscription with valid input",
    async () => {
      const subscriptionData = {
        plan: PlanType.CLOUD_SYNC,
        cycle: BillingCycle.YEARLY,
      };

      const result = await subscribe(subscriptionData, global.testEnv.agent);

      // Verify the result structure
      expect(result).toBeDefined();
      // Add more specific assertions based on your actual implementation
    },
    { timeout: 30000 }
  );

  it("should throw error when plan is missing", async () => {
    const invalidData = {
      cycle: BillingCycle.MONTHLY,
    };

    await expect(subscribe(invalidData, global.testEnv.agent)).rejects.toThrow(
      ValidationError
    );
    await expect(subscribe(invalidData, global.testEnv.agent)).rejects.toThrow(
      "No plan provided"
    );
  });

  it("should throw error when cycle is missing", async () => {
    const invalidData = {
      plan: PlanType.CLOUD_SYNC,
    };

    await expect(subscribe(invalidData, global.testEnv.agent)).rejects.toThrow(
      ValidationError
    );
    await expect(subscribe(invalidData, global.testEnv.agent)).rejects.toThrow(
      "No cycle provided"
    );
  });

  it("should handle non-existent user", async () => {
    const invalidAgent = {
      ...global.testEnv.agent,
      id: "user:nonexistent",
    };

    const subscriptionData = {
      plan: PlanType.CLOUD_SYNC,
      cycle: BillingCycle.MONTHLY,
    };

    await expect(subscribe(subscriptionData, invalidAgent)).rejects.toThrow(
      ValidationError
    );
    await expect(subscribe(subscriptionData, invalidAgent)).rejects.toThrow(
      "User not found"
    );
  });
});
