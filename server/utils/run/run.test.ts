import { describe, it, expect } from "vitest";
import { performUtilRunAction } from "./index";

type SuccessResponse = {
  text: string;
  headers: string;
};

type ErrorResponse = {
  error: string;
  message?: any;
};

type ActionResponse = SuccessResponse | ErrorResponse;

describe("performUtilRunAction", () => {
  it("should return error when action is not specified", async () => {
    const result = await performUtilRunAction({}, {});
    expect(result).toEqual({ error: "Action not specified" });
  });

  it("should return error for unsupported action", async () => {
    const result = await performUtilRunAction({ action: "invalid-action" }, {});
    expect(result).toEqual({ error: "Action not supported" });
  });

  describe("get-webpage action", () => {
    it("should return error when URL is not specified", async () => {
      const result = await performUtilRunAction({ action: "get-webpage" }, {});
      expect(result).toEqual({ error: "URL not specified" });
    });

    it("should return error for invalid URL", async () => {
      const result = await performUtilRunAction(
        { action: "get-webpage", url: "invalid-url" },
        {}
      );
      expect(result).toEqual({ error: "Invalid URL" });
    });

    describe("integration", () => {
      it("should fetch and return webpage content for a real URL", async () => {
        const result = (await performUtilRunAction(
          { action: "get-webpage", url: "https://example.com" },
          {}
        )) as ActionResponse;

        if ("error" in result) {
          throw new Error(
            "Expected successful response but got error: " + result.error
          );
        }

        expect(result.text).toBeDefined();
        expect(result.headers).toBeDefined();
        expect(typeof result.text).toBe("string");
        expect(result.text.length).toBeGreaterThan(0);
      }, 10000);

      it("should handle HTTPS URLs with complex paths and query parameters", async () => {
        const result = (await performUtilRunAction(
          {
            action: "get-webpage",
            url: "https://httpbin.org/get?param1=test&param2=value"
          },
          {}
        )) as ActionResponse;
        if ("error" in result) {
          throw new Error(
            "Expected successful response but got error: " + result.error
          );
        }

        expect(result.text).toBeDefined();
        expect(result.headers).toBeDefined();
        expect(typeof result.text).toBe("string");
        expect(result.text.length).toBeGreaterThan(0);
      }, 10000);

      it("should handle network errors gracefully", async () => {
        const result = (await performUtilRunAction(
          {
            action: "get-webpage",
            url: "https://this-domain-should-not-exist-123456789.com"
          },
          {}
        )) as ActionResponse;

        expect("error" in result).toBe(true);
        if ("error" in result) {
          expect(result.error).toBe("Invalid URL found");
        }
      }, 10000);

      it("should fetch memotron.io and return proper headers", async () => {
        const result = (await performUtilRunAction(
          {
            action: "get-webpage",
            url: "https://memotron.io"
          },
          {}
        )) as ActionResponse;

        if ("error" in result) {
          throw new Error(
            "Expected successful response but got error: " + result.error
          );
        }

        expect(result.text).toBeDefined();
        expect(result.headers).toBeDefined();

        const headers = JSON.parse(result.headers);
        expect(headers).toHaveProperty("content-type");
        expect(headers).toHaveProperty("server");
        expect(headers).toHaveProperty("date");
        expect(headers["content-type"].toLowerCase()).toContain("text/html");
      }, 10000);
    });
  });
});
