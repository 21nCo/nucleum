import { describe, it, expect } from "vitest";
import { retrieveAppConfig } from "./utils";

describe("retrieveAppConfig", () => {
  it("should retrieve app config for a valid app domain", async () => {
    // Test with a typical app domain format
    const testApp = "dev.pointron.app";

    const result = await retrieveAppConfig(testApp);
    console.log({ result });
    // Verify the result has the expected structure
    expect(result).toBeDefined();
    expect(result).toHaveProperty("env");
    expect(result).toHaveProperty("product");

    // Verify the product and env are extracted correctly
    expect(result.product).toBe("pointron");
    expect(result.env).toBe("dev");
  });

  it("should handle environment-specific configuration overrides", async () => {
    // Test with a production domain
    const testApp = "live.pointron.app";

    const result = await retrieveAppConfig(testApp);

    expect(result).toBeDefined();
    expect(result.product).toBe("pointron");
    expect(result.env).toBe("live");
  });
});
