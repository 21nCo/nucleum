import { describe, it, expect } from "vitest";
import { extractProduct } from "@21n/shared-utils/product-host";

describe("extractProduct", () => {
  it("treats local app subdomains as the local environment", () => {
    expect(extractProduct("local.nucleum.app")).toEqual({
      env: "local",
      product: "nucleum"
    });
    expect(extractProduct("local.memotron.app")).toEqual({
      env: "local",
      product: "memotron"
    });
  });
});
