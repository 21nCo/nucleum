import { describe, it, expect } from "vitest";
import { resolveDboUpdateQuery } from "@21n/shared-utils/surreal.utils";
import { globalDbo } from "@21n/shared-dbo";
import { memotronDboDefinitions } from "@21n/shared-dbo";
import { pointronDboDefinitions } from "@21n/shared-dbo";
describe("resolveBootstrapQuery", () => {
  it("should return concatenated string of table names and function results when valid dbo array is provided", () => {
    const dbo = [
      Object.keys(memotronDboDefinitions)[0],
      Object.keys(pointronDboDefinitions)[0],
      Object.keys(globalDbo)[0]
    ];
    const result = resolveDboUpdateQuery(dbo);
    expect(result).toContain(dbo[0]);
    expect(result).toContain(dbo[1]);
    expect(result).toContain(dbo[2]);

    expect(result).not.toContain("\n");
    expect(result).not.toContain("\t");

    expect(result.split(";").length).toBeGreaterThan(1);
  });

  it("should return an empty string when dbo is not an array", () => {
    const dbo = "not an array";
    const result = resolveDboUpdateQuery(dbo);
    expect(result).toBe("");
  });
});
