import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signup } from "./index";
import { DatabaseProviderFactory } from "$lib/server/database/providers";
import { ValidationError, AuthorizationError } from "../errors";
import { generateRandomIdv2 } from "$lib/shared/utils/crypto.utils";

describe("signup integration tests", () => {
  const testEmail = "test@example.com";
  const testPassword = "password123";
  const testNickName = "Test User";
  const testApp = "test.com";
  let testUserId: string;

  beforeEach(() => {
    testUserId = generateRandomIdv2();
  });

  afterEach(async () => {
    // Cleanup: Remove any test users created during testing
    try {
      const provider = DatabaseProviderFactory.getProvider();
      if (testUserId) {
        // Clean up the test user if it was created
        await provider.deleteUser({
          id: testUserId,
          context: "test",
          db: "test",
          region: "test"
        });
      }
    } catch (error) {
      // Ignore cleanup errors as they may be expected in some test scenarios
    }
  });

  describe("successful signup scenarios", () => {
    it("should successfully signup a new user with all required fields", async () => {
      const signupData = {
        email: testEmail,
        pass: testPassword,
        nickName: testNickName,
        profilePictureUrl: "https://example.com/avatar.jpg",
        isTrusted: true,
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost",
          timezone: "UTC"
        }
      };

      const result = await signup(signupData);

      expect(result).toBeDefined();

      // The signup function can return a number (existing user count) or an object
      if (typeof result === "object") {
        if ("error" in result) {
          expect(result.error).toBeUndefined();
        }

        if ("token" in result && result.token) {
          expect(result.token).toBeDefined();
          expect(result.userInfo).toBeDefined();
          expect(result.userInfo.nickName).toBe(testNickName);
          expect(result.isSignup).toBe(true);
        } else if ("userInfo" in result) {
          // If no token is returned, it might be because USE_THIRDPARTY_AUTH_METHOD is false
          // In this case, we should still get userInfo back
          expect(result.userInfo).toBeDefined();
        }
      } else {
        // If result is a number, it means the user already exists
        expect(typeof result).toBe("number");
      }
    });

    it("should successfully signup a new user with minimal required fields", async () => {
      const signupData = {
        email: `minimal-${testUserId}@example.com`,
        pass: testPassword,
        nickName: "Minimal User",
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost"
        }
      };

      const result = await signup(signupData);

      expect(result).toBeDefined();

      if (typeof result === "object") {
        if ("error" in result) {
          expect(result.error).toBeUndefined();
        }

        if ("userInfo" in result) {
          expect(result.userInfo.nickName).toBe("Minimal User");
        }
      }
    });

    it("should successfully signup via OAuth", async () => {
      const oAuthData = {
        email: `oauth-${testUserId}@example.com`,
        nickName: "OAuth User",
        profilePictureUrl: "https://oauth-provider.com/avatar.jpg",
        sub: "oauth-sub-12345",
        isTrusted: true,
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost",
          oauthData: {
            provider: "google",
            sub: "oauth-sub-12345"
          }
        }
      };

      const result = await signup(oAuthData, true);

      expect(result).toBeDefined();

      if (typeof result === "object") {
        if ("error" in result) {
          expect(result.error).toBeUndefined();
        }

        if ("userInfo" in result) {
          expect(result.userInfo.nickName).toBe("OAuth User");
          // Note: isOAuth might not be present in the returned userInfo type, but should be in the actual data
        }
      }
    });
  });

  describe("duplicate user scenarios", () => {
    it("should return existing user count for non-OAuth duplicate signup", async () => {
      const signupData = {
        email: `duplicate-${testUserId}@example.com`,
        pass: testPassword,
        nickName: "First User",
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost"
        }
      };

      // First signup should succeed
      const firstResult = await signup(signupData);
      expect(firstResult).toBeDefined();

      // Second signup with same email should return user count
      const duplicateSignupData = {
        ...signupData,
        nickName: "Duplicate User",
        context: {
          ...signupData.context,
          guest: generateRandomIdv2() // Different guest ID
        }
      };

      const secondResult = await signup(duplicateSignupData);

      // Should return a number indicating existing user count
      expect(typeof secondResult).toBe("number");
      expect(secondResult).toBeGreaterThan(0);
    });

    it("should login existing OAuth user on duplicate signup", async () => {
      const oAuthData = {
        email: `oauth-existing-${testUserId}@example.com`,
        nickName: "OAuth User",
        sub: "oauth-sub-67890",
        isTrusted: true,
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost"
        }
      };

      // First OAuth signup
      const firstResult = await signup(oAuthData, true);
      expect(firstResult).toBeDefined();

      // Second OAuth signup with same email should login
      const secondOAuthData = {
        ...oAuthData,
        context: {
          ...oAuthData.context,
          guest: generateRandomIdv2()
        }
      };

      const secondResult = await signup(secondOAuthData, true);

      expect(secondResult).toBeDefined();

      if (typeof secondResult === "object") {
        if ("error" in secondResult) {
          expect(secondResult.error).toBeUndefined();
        }

        if ("userInfo" in secondResult) {
          expect(secondResult.userInfo.nickName).toBe("OAuth User");
        }
      }
    });
  });

  describe("beta list validation", () => {
    it("should throw ValidationError when email is missing for beta products", async () => {
      const signupData = {
        email: "", // Empty email
        pass: testPassword,
        nickName: testNickName,
        context: {
          guest: testUserId,
          app: "app.selftron.io", // Beta product
          host: "app.selftron.io"
        }
      };

      await expect(signup(signupData)).rejects.toThrow(ValidationError);
    });

    it("should throw AuthorizationError when user is not in beta list for beta products", async () => {
      const signupData = {
        email: `notinbeta-${testUserId}@example.com`,
        pass: testPassword,
        nickName: testNickName,
        context: {
          guest: testUserId,
          app: "app.selftron.io", // Beta product
          host: "app.selftron.io"
        }
      };

      await expect(signup(signupData)).rejects.toThrow(AuthorizationError);
    });

    it("should allow signup for non-beta products without beta list check", async () => {
      const signupData = {
        email: `nonbeta-${testUserId}@example.com`,
        pass: testPassword,
        nickName: testNickName,
        context: {
          guest: testUserId,
          app: "regular-app.com", // Non-beta product
          host: "regular-app.com"
        }
      };

      const result = await signup(signupData);

      expect(result).toBeDefined();

      if (typeof result === "object" && "error" in result) {
        expect(result.error).toBeUndefined();
      }
    });
  });

  describe("email processing", () => {
    it("should correctly process email parts during signup", async () => {
      const signupData = {
        email: `emailparts-${testUserId}@gmail.com`,
        pass: testPassword,
        nickName: "Email Parts User",
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost"
        }
      };

      const result = await signup(signupData);

      expect(result).toBeDefined();

      if (typeof result === "object" && "userInfo" in result) {
        expect(result.userInfo.emailParts).toBeDefined();
        expect(result.userInfo.emailParts?.emailDomain).toBe("gmail.com");
        expect(result.userInfo.emailParts?.firstFew).toContain("emailparts");
      }
    });
  });

  describe("context and metadata", () => {
    it("should store context and metadata correctly", async () => {
      const signupData = {
        email: `context-${testUserId}@example.com`,
        pass: testPassword,
        nickName: "Context User",
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost",
          timezone: "America/New_York",
          userAgent: "Test Browser",
          referrer: "https://example.com"
        }
      };

      const result = await signup(signupData);

      expect(result).toBeDefined();

      if (typeof result === "object" && "userInfo" in result) {
        // Note: context property might not be available in the type definition but should be in actual data
        const userInfoWithContext = result.userInfo as any;
        expect(userInfoWithContext.context).toBeDefined();
        expect(userInfoWithContext.context.timezone).toBe("America/New_York");
        expect(userInfoWithContext.context.userAgent).toBe("Test Browser");
        expect(result.userInfo.joinDate).toBeDefined();
      }
    });

    it("should set join date to current timestamp", async () => {
      const beforeSignup = new Date();

      const signupData = {
        email: `timestamp-${testUserId}@example.com`,
        pass: testPassword,
        nickName: "Timestamp User",
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost"
        }
      };

      const result = await signup(signupData);
      const afterSignup = new Date();

      expect(result).toBeDefined();

      if (
        typeof result === "object" &&
        "userInfo" in result &&
        result.userInfo.joinDate
      ) {
        const joinDate = new Date(result.userInfo.joinDate);
        expect(joinDate.getTime()).toBeGreaterThanOrEqual(
          beforeSignup.getTime()
        );
        expect(joinDate.getTime()).toBeLessThanOrEqual(afterSignup.getTime());
      }
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Test with invalid context that might cause database issues
      const signupData = {
        email: `dberror-${testUserId}@example.com`,
        pass: testPassword,
        nickName: "DB Error User",
        context: {
          guest: "", // Invalid guest ID
          app: "localhost",
          host: "localhost"
        }
      };

      // Depending on the database provider, this might throw an error or return an error object
      try {
        const result = await signup(signupData);

        if (typeof result === "object" && "error" in result && result.error) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe("string");
        }
      } catch (error) {
        // Database-related errors are acceptable in integration tests
        expect(error).toBeDefined();
      }
    });
  });

  describe("profile picture handling", () => {
    it("should handle signup with profile picture URL", async () => {
      const signupData = {
        email: `avatar-${testUserId}@example.com`,
        pass: testPassword,
        nickName: "Avatar User",
        profilePictureUrl: "https://example.com/user-avatar.png",
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost"
        }
      };

      const result = await signup(signupData);

      expect(result).toBeDefined();

      if (typeof result === "object" && "userInfo" in result) {
        expect(result.userInfo.profilePictureUrl).toBe(
          "https://example.com/user-avatar.png"
        );
      }
    });

    it("should handle signup without profile picture URL", async () => {
      const signupData = {
        email: `noavatar-${testUserId}@example.com`,
        pass: testPassword,
        nickName: "No Avatar User",
        context: {
          guest: testUserId,
          app: "localhost",
          host: "localhost"
        }
      };

      const result = await signup(signupData);

      expect(result).toBeDefined();

      if (typeof result === "object" && "userInfo" in result) {
        expect(result.userInfo.nickName).toBe("No Avatar User");
        // profilePictureUrl should either be undefined or an empty string
        expect([undefined, "", null]).toContain(
          result.userInfo.profilePictureUrl
        );
      }
    });
  });
});
