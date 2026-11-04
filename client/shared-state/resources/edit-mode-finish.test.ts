import { describe, expect, it, vi } from "vitest";
import {
  finishEditMode,
  registerEditModeFinisher
} from "@nucleum/shared-state/resources/edit-mode-finish";

describe("finishEditMode", () => {
  it("closes right away without a registered editor", async () => {
    const close = vi.fn();
    await finishEditMode("node:none", close);
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps edit mode open when the registered editor fails to finish", async () => {
    const close = vi.fn();
    const release = registerEditModeFinisher("node:a", async () => false);
    await finishEditMode("node:a", close);
    expect(close).not.toHaveBeenCalled();
    release();
  });

  it("closes after the registered editor finishes", async () => {
    const close = vi.fn();
    const release = registerEditModeFinisher("node:b", async () => true);
    await finishEditMode("node:b", close);
    expect(close).toHaveBeenCalledOnce();
    release();
    await finishEditMode("node:b", close);
    expect(close).toHaveBeenCalledTimes(2);
  });
});
