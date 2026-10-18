import Offline from "@nucleum/surfaces/help/errors/Offline.svelte";
import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import { expectAccessible } from "@tests/utils/accessibility";

const mockGotoPath = vi.hoisted(() => vi.fn());
const mockAppStore = vi.hoisted(() => {
  const { writable } = require("svelte/store");
  return writable({ currentPath: "/focus" });
});

vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: {
    subscribe: mockAppStore.subscribe
  }
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: mockGotoPath }
}));

describe("Offline component", () => {
  it("prompts the app store to retry the current path", async () => {
    const { getByRole, container } = render(Offline);

    const button = getByRole("button", { name: /try again/i });
    await fireEvent.click(button);

    expect(mockGotoPath).toHaveBeenCalledWith("/focus");
    await expectAccessible(container);
  });
});
