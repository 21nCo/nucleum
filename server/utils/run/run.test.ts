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

type MetadataResponse = {
  url: string;
  title?: string | null;
  faviconUrl?: string | null;
  ogTitle?: string;
  ogImage?: string;
  ogDescription?: string;
  description?: string;
  language?: string | null;
  canonicalUrl?: string | null;
  error?: string;
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

  describe("get-multiple-webpage-metadata action", () => {
    it("should return error when URLs array is not specified", async () => {
      const result = await performUtilRunAction(
        { action: "get-multiple-webpage-metadata" },
        {}
      );
      expect(result).toEqual({ error: "URLs array not specified" });
    });

    it("should return error when URLs is not an array", async () => {
      const result = await performUtilRunAction(
        { action: "get-multiple-webpage-metadata", urls: "not-an-array" },
        {}
      );
      expect(result).toEqual({ error: "URLs array not specified" });
    });

    it("should handle empty URLs array", async () => {
      const result = await performUtilRunAction(
        { action: "get-multiple-webpage-metadata", urls: [] },
        {}
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should return error for invalid URLs", async () => {
      const result = await performUtilRunAction(
        {
          action: "get-multiple-webpage-metadata",
          urls: ["invalid-url", "another-invalid"]
        },
        {}
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ url: "invalid-url", error: "Invalid URL" });
      expect(result[1]).toEqual({
        url: "another-invalid",
        error: "Invalid URL"
      });
    });

    describe("integration", () => {
      it("should extract metadata from a single real URL", async () => {
        const result = (await performUtilRunAction(
          {
            action: "get-multiple-webpage-metadata",
            urls: ["https://example.com"]
          },
          {}
        )) as MetadataResponse[];

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);

        const metadata = result[0];
        expect(metadata.url).toBe("https://example.com");
        expect(metadata.title).toBeDefined();
        expect(typeof metadata.title).toBe("string");
        expect(metadata.faviconUrl).toBeDefined();
        expect(metadata.faviconUrl).toMatch(/^https?:\/\//);
      }, 15000);

      it("should extract metadata from multiple real URLs", async () => {
        const urls = ["https://example.com", "https://httpbin.org"];
        const result = (await performUtilRunAction(
          { action: "get-multiple-webpage-metadata", urls },
          {}
        )) as MetadataResponse[];

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);

        result.forEach((metadata, index) => {
          expect(metadata.url).toBe(urls[index]);
          expect(metadata.title).toBeDefined();
          expect(typeof metadata.title).toBe("string");
          expect(metadata.faviconUrl).toBeDefined();
        });
      }, 15000);

      it("should handle mixed valid and invalid URLs", async () => {
        const urls = [
          "https://example.com",
          "invalid-url",
          "https://httpbin.org"
        ];
        const result = (await performUtilRunAction(
          { action: "get-multiple-webpage-metadata", urls },
          {}
        )) as MetadataResponse[];

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(3);

        // First URL should succeed
        expect(result[0].url).toBe("https://example.com");
        expect(result[0].title).toBeDefined();
        expect(result[0].error).toBeUndefined();

        // Second URL should fail
        expect(result[1].url).toBe("invalid-url");
        expect(result[1].error).toBe("Invalid URL");

        // Third URL should succeed
        expect(result[2].url).toBe("https://httpbin.org");
        expect(result[2].title).toBeDefined();
        expect(result[2].error).toBeUndefined();
      }, 15000);

      it.only("should extract comprehensive metadata from a rich webpage", async () => {
        const siteUrl = "https://github.com";
        const result = (await performUtilRunAction(
          {
            action: "get-multiple-webpage-metadata",
            urls: [siteUrl]
          },
          {}
        )) as MetadataResponse[];
        console.log({ result });
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);

        const metadata = result[0];
        expect(metadata.url).toBe(siteUrl);
        expect(metadata.title).toBeDefined();
        expect(metadata.title?.length).toBeGreaterThan(0);
        expect(metadata.faviconUrl).toBeDefined();
        expect(metadata.faviconUrl).toMatch(/^https?:\/\//);

        // GitHub should have Open Graph data
        expect(
          metadata.ogTitle || metadata.ogDescription || metadata.ogImage
        ).toBeDefined();

        // Should have description
        expect(metadata.description).toBeDefined();
      }, 15000);

      it("should handle network errors gracefully", async () => {
        const result = (await performUtilRunAction(
          {
            action: "get-multiple-webpage-metadata",
            urls: ["https://this-domain-should-not-exist-123456789.com"]
          },
          {}
        )) as MetadataResponse[];

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe(
          "https://this-domain-should-not-exist-123456789.com"
        );
        expect(result[0].error).toBe("Failed to fetch URL");
        expect(result[0].message).toBeDefined();
      }, 15000);

      it("should process URLs concurrently for better performance", async () => {
        const urls = [
          "https://example.com",
          "https://httpbin.org",
          "https://jsonplaceholder.typicode.com"
        ];

        const startTime = Date.now();
        const result = (await performUtilRunAction(
          { action: "get-multiple-webpage-metadata", urls },
          {}
        )) as MetadataResponse[];
        const endTime = Date.now();

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(3);

        // All requests should complete successfully
        result.forEach((metadata, index) => {
          expect(metadata.url).toBe(urls[index]);
          expect(metadata.error).toBeUndefined();
          expect(metadata.title).toBeDefined();
        });

        // Should complete in reasonable time (concurrent processing should be faster than sequential)
        const totalTime = endTime - startTime;
        expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds for 3 URLs
      }, 25000);
    });
  });
});
