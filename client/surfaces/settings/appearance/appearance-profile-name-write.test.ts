import { describe, expect, it, vi } from "vitest";
import {
  PROFILE_NAME_MISSING_MESSAGE,
  PROFILE_NAME_SAVE_FAILED_MESSAGE,
  runProfileNameWrite
} from "./appearance-profile-name-write";

describe("runProfileNameWrite", () => {
  it("closes the editor after a successful write", async () => {
    const onError = vi.fn();
    await expect(
      runProfileNameWrite(() => Promise.resolve({ ok: true }), onError)
    ).resolves.toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([
    ["rejected", () => Promise.reject(new Error("offline"))],
    ["unsuccessful", () => Promise.resolve({ ok: false })],
    [
      "throwing",
      () => {
        throw new Error("sync");
      }
    ]
  ])("keeps the editor open after a %s write", async (_label, write) => {
    const onError = vi.fn();
    await expect(runProfileNameWrite(write, onError)).resolves.toBe(false);
    expect(onError).toHaveBeenCalledWith(PROFILE_NAME_SAVE_FAILED_MESSAGE);
  });

  it("closes the editor and reports a missing profile", async () => {
    const onError = vi.fn();
    await expect(runProfileNameWrite(() => undefined, onError)).resolves.toBe(
      true
    );
    expect(onError).toHaveBeenCalledWith(PROFILE_NAME_MISSING_MESSAGE);
  });
});
