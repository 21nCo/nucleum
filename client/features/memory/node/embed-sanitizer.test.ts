import { describe, it, expect } from "vitest";
import { sanitize } from "./embed-sanitizer";

describe("sanitize", () => {
  it("keeps trusted gist and gitlab script embeds as normalized embed URLs", () => {
    expect(
      sanitize(
        '<script src="https://gist.github.com/example/abc123.js"></script>'
      )
    ).toEqual({
      embed: "https://gist.github.com/example/abc123",
      isGist: true
    });
    expect(
      sanitize('<script src="https://gitlab.com/-/snippets/12345.js"></script>')
    ).toEqual({
      embed: "https://gitlab.com/-/snippets/12345",
      isGist: true
    });
  });

  it("strips unsafe html instead of trying to filter dangerous fragments in place", () => {
    expect(
      sanitize('<img src=x onerror="alert(1)">hello<script >bad</script>')
    ).toBe("hellobad");
  });

  it("allows media embeds only with http or https src values", () => {
    expect(
      sanitize('<iframe src="https://example.com/embed"></iframe>')
    ).toEqual({
      embed: "https://example.com/embed"
    });
    expect(sanitize('<embed src="https://example.com/embed">')).toEqual({
      embed: "https://example.com/embed"
    });
    expect(() => sanitize('<iframe src="vbscript:alert(1)"></iframe>')).toThrow(
      "Invalid URL"
    );
    expect(
      sanitize(
        '<iframe src="https://example.com/embed"></iframe><script>alert(1)</script>'
      )
    ).toBe("alert(1)");
  });
});
