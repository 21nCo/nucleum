import { describe, it, expect } from "vitest";
import { ping } from "./index";

describe("ping", () => {
  it(
    "should create an activity and return user data",
    async () => {
      const userId = "m6oycdd9ighfkxlf8ctxw4pr";
      const context = { source: "test" };

      const result = await ping(userId, context);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      const userResult = result[0];
      expect(Array.isArray(userResult)).toBe(true);
      expect(userResult[0]).toHaveProperty("id", `user:${userId}`);

      const activityResult = result[1];
      expect(Array.isArray(activityResult)).toBe(true);
      expect(activityResult[0]).toHaveProperty("userId", `user:${userId}`);
      expect(activityResult[0]).toHaveProperty("context");
      expect(activityResult[0].context).toEqual(context);
      expect(activityResult[0]).toHaveProperty("timestamp");
      expect(new Date(activityResult[0].timestamp)).toBeInstanceOf(Date);
    },
    { timeout: 30000 }
  );
});
