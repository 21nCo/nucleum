import { describe, it, expect, vi, beforeEach } from "vitest";
import { performUserAccountAction } from ".";
import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";
import { AuthenticationError } from "../errors";

// vi.mock("$lib/server/surrealHelpers", () => ({
//   performQueryOnMasterDb: vi.fn()
// }));

const bootstrapData = {
  action: "bootstrap",
  region: "insouth",
  context: {
    host: "dev.pointron.io"
  }
};

describe("performUserAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip("guest action", () => {
    it("should create a guest user", async () => {
      // const mockResponse = [{ result: true }];
      // (performQueryOnMasterDb as any).mockResolvedValue(mockResponse);

      const guestData = {
        action: "guest",
        id: "guestone",
        context: {
          host: "test.com",
          timezone: "UTC"
        }
      };

      const result = await performUserAccountAction(null, guestData);

      expect(result).toEqual({ id: "guestone" });
      expect(performQueryOnMasterDb).toHaveBeenCalledTimes(1);
    });
  });

  describe("bootstrap action", () => {
    it("should throw AuthenticationError when no token provided", async () => {
      await expect(
        performUserAccountAction(null, bootstrapData)
      ).rejects.toThrow(AuthenticationError);
    });

    it("should bootstrap user account with valid token", async () => {
      // const mockResponse = [
      //   { result: [{ region: "insouth", isBootstrapped: true }] },
      //   {
      //     result: [
      //       { guest: { context: { timezone: { offset: -330, label: "UTC" } } } }
      //     ]
      //   }
      // ];
      // (performQueryOnMasterDb as any).mockResolvedValue(mockResponse);

      //TODO - signup a test user and generate a token for this
      const result = await performUserAccountAction(
        "Bearer {token}",
        bootstrapData
      );

      expect(result).toBeDefined();
      expect(performQueryOnMasterDb).toHaveBeenCalled();
    });
  });
});
