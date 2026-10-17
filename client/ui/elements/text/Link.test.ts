import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { elementPlatform } from "@21n/ui/environment/element-environment.store";
import { getElementActionHost } from "@21n/ui/hosts/action-host";
import Link from "./Link.svelte";

vi.mock("@21n/ui/hosts/action-host", () => ({
  getElementActionHost: vi.fn()
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(getElementActionHost).mockReset();
  elementPlatform.set({
    embed: "NONE",
    isEmbed: false,
    isTouchDevice: false,
    os: "UNDETERMINED"
  });
});

describe("Link navigation", () => {
  it.each([
    { href: "https://example.com", isEmbed: true },
    { href: "example.com", isEmbed: false }
  ])("delegates $href to the host exactly once", async ({ href, isEmbed }) => {
    elementPlatform.update((value) => ({ ...value, isEmbed }));
    const openLink = vi.fn();
    const openWindow = vi.spyOn(window, "open").mockReturnValue(null);
    const onclick = vi.fn();
    vi.mocked(getElementActionHost).mockReturnValue({
      openLink,
      runAction: vi.fn(),
      renderer: vi.fn()
    });
    const { getByRole } = render(Link, {
      href,
      label: "Visit website",
      isEnforeHttpIfMatchPattern: true,
      onclick
    });

    await fireEvent.click(getByRole("button", { name: "Visit website" }));

    expect(openLink).toHaveBeenCalledOnce();
    expect(openLink).toHaveBeenCalledWith("https://example.com");
    expect(openWindow).not.toHaveBeenCalled();
    expect(onclick).toHaveBeenCalledOnce();
  });

  it.each([
    { href: "https://example.com", isEmbed: true },
    { href: "example.com", isEmbed: false }
  ])("opens $href when no host is installed", async ({ href, isEmbed }) => {
    elementPlatform.update((value) => ({ ...value, isEmbed }));
    const openWindow = vi.spyOn(window, "open").mockReturnValue(null);
    const { getByRole } = render(Link, {
      href,
      label: "Visit website",
      isEnforeHttpIfMatchPattern: true
    });

    await fireEvent.click(getByRole("button", { name: "Visit website" }));

    expect(openWindow).toHaveBeenCalledOnce();
    expect(openWindow).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer"
    );
  });
});
