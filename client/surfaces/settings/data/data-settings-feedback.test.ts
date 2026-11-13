import { beforeEach, describe, expect, it, vi } from "vitest";

const toasts = vi.hoisted(() => ({
  showProgress: vi.fn(),
  closeProgress: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  trigger: vi.fn()
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts
}));

import { renderMdAsHtml } from "@21n/ui/elements/markdown/markdown.utils";
import {
  formatFileToastMessage,
  runWithStatusToast
} from "./data-settings-feedback";

const messages = { progress: "Working", success: "Done", failure: "Failed" };

describe("runWithStatusToast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("replaces the progress toast with a success toast", async () => {
    await expect(
      runWithStatusToast("op", messages, async () => {})
    ).resolves.toBe(true);
    expect(toasts.showProgress).toHaveBeenCalledWith("op", "Working");
    expect(toasts.success).toHaveBeenCalledWith("Done", {
      closeProgressId: "op"
    });
    expect(toasts.error).not.toHaveBeenCalled();
  });

  it("replaces the progress toast with a failure toast and reports the error", async () => {
    const onError = vi.fn();
    const error = new Error("nope");
    await expect(
      runWithStatusToast(
        "op",
        messages,
        async () => {
          throw error;
        },
        onError
      )
    ).resolves.toBe(false);
    expect(onError).toHaveBeenCalledWith(error);
    expect(toasts.error).toHaveBeenCalledWith("Failed", {
      closeProgressId: "op"
    });
    expect(toasts.success).not.toHaveBeenCalled();
  });

  it("closes the progress toast silently when the operation ends early", async () => {
    await expect(
      runWithStatusToast("op", messages, async () => false)
    ).resolves.toBe(false);
    expect(toasts.closeProgress).toHaveBeenCalledWith("op");
    expect(toasts.success).not.toHaveBeenCalled();
    expect(toasts.error).not.toHaveBeenCalled();
  });
});

describe("formatFileToastMessage", () => {
  it("renders HTML and Markdown in a file name literally", () => {
    const fileName = "<img src=x onerror=alert(1)>**bold**_x_.json";
    const container = document.createElement("div");
    container.innerHTML = renderMdAsHtml(
      formatFileToastMessage("Restoring data from", fileName, "...")
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelectorAll("b, strong")).toHaveLength(1);
    expect(container.querySelector("b, strong")?.textContent).toBe(fileName);
    expect(container.textContent).toContain(
      `Restoring data from ${fileName}...`
    );
  });
});
