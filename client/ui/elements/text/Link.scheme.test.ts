import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import Link from "./Link.svelte";

describe("Link with a script URL", () => {
  it("does not render a javascript: URL that contains http as an anchor", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    render(Link, {
      props: { href: "javascript:alert(document.domain)//http", label: "Open" }
    });
    expect(document.querySelector("a")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("renders an https URL as an external anchor", () => {
    render(Link, { props: { href: "https://example.com/a", label: "Site" } });
    const anchor = screen.getByRole("link", { name: "Site" });
    expect(anchor.getAttribute("href")).toBe("https://example.com/a");
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
