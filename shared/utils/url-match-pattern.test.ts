import { describe, expect, it } from "vitest";
import { isUrlMatchPattern } from "@21n/shared-utils/url.utils";

describe("shared/utils/url.utils isUrlMatchPattern", () => {
  it("rejects numbers that WHATWG URL parsing would expand into IPv4 hosts", () => {
    expect(isUrlMatchPattern("3.14")).toBe(false);
    expect(isUrlMatchPattern("1.5")).toBe(false);
  });

  it("rejects alternate IPv4 spellings that URL parsing canonicalizes", () => {
    expect(isUrlMatchPattern("0x7f000001")).toBe(false);
    expect(isUrlMatchPattern("https://2130706433/admin")).toBe(false);
    expect(isUrlMatchPattern("%31%32%37.0.0.1")).toBe(false);
  });

  it("rejects email addresses and mailto strings parsed as credentials", () => {
    expect(isUrlMatchPattern("john@example.com")).toBe(false);
    expect(isUrlMatchPattern("mailto:a@b.com")).toBe(false);
  });

  it("keeps accepting typed hosts, full IPv4 addresses, and ports", () => {
    expect(isUrlMatchPattern("example.com/path")).toBe(true);
    expect(isUrlMatchPattern("192.168.1.1")).toBe(true);
    expect(isUrlMatchPattern("localhost.test:8080/a")).toBe(true);
    expect(isUrlMatchPattern("https://Example.com")).toBe(true);
  });
});
