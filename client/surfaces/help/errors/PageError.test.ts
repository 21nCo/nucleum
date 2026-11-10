import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: vi.fn() }
}));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: vi.fn() })
}));
vi.mock("@nucleum/surfaces/settings/about/SystemStatus.svelte", async () => ({
  default: (await import("@tests/fixtures/components/EmptyStub.svelte")).default
}));

import PageError from "./PageError.svelte";

describe("PageError", () => {
  it("shows the missing path as text, not markup", () => {
    const missingPath = '<img src=x onerror="alert(1)">';
    const { container, getByText } = render(PageError, {
      isNotFoundPage: true,
      notFoundPath: missingPath
    });

    expect(getByText(missingPath).tagName).toBe("B");
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("you're looking for doesn't exist.");
  });
});
