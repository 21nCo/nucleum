import { afterEach, describe, expect, it, vi } from "vitest";

import { LogType } from "@nucleum/client/runtime/logging/log.type";

async function loadLogger(env: string, search: string, mode?: string) {
  vi.resetModules();
  vi.stubEnv("VITE_ENV", env);
  if (mode) vi.stubEnv("MODE", mode);
  window.history.replaceState(null, "", `/${search}`);
  return (await import("@nucleum/client/runtime/logging/logger")).logger;
}

describe("logger overrides in live builds", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState(null, "", "/");
    window.localStorage.removeItem("debugSinkUrl");
  });

  it("ignores the ?log= level override in live builds", async () => {
    const logger = await loadLogger("live", "?log=4");
    expect(logger.level).not.toBe(LogType.DEBUG);
  });

  it("treats a Vite live-mode build without VITE_ENV as live", async () => {
    const logger = await loadLogger("", "?log=4", "live");
    expect(logger.level).not.toBe(LogType.DEBUG);
  });

  it("keeps the ?log= level override outside live builds", async () => {
    const logger = await loadLogger("dev", "?log=4");
    expect(logger.level).toBe(4);
  });

  it("does not send logs to a debug sink URL stored in the browser in live builds", async () => {
    window.localStorage.setItem("debugSinkUrl", "https://sink.example.test");
    vi.stubEnv("VITE_DEBUG_SINK_URL", undefined as unknown as string);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null));
    const logger = await loadLogger("live", "");
    logger.error("boom");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
