import { afterEach, expect, vi } from "vitest";

process.env.TZ = "UTC";

await import("./utils/fuzz");

afterEach(() => {
  vi.restoreAllMocks();
});

if (typeof globalThis.fetch === "undefined") {
  const { fetch, Headers, Request, Response } = await import("undici");
  Object.assign(globalThis, { fetch, Headers, Request, Response });
}

if (typeof window !== "undefined") {
  const matchersModule = await import("@testing-library/jest-dom/matchers");
  expect.extend(matchersModule);
}

if (typeof URL !== "undefined") {
  if (typeof URL.createObjectURL !== "function") {
    URL.createObjectURL = vi.fn(() => "blob:mock");
  }
  if (typeof URL.revokeObjectURL !== "function") {
    URL.revokeObjectURL = vi.fn();
  }
}
