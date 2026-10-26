import { describe, expect, it } from "vitest";
import { parseNativeMessage } from "./native-message";

describe("native message validation", () => {
  const message = (overrides: Partial<MessageEvent> = {}) =>
    ({
      source: window,
      origin: window.location.origin,
      data: {
        type: "SWIFT_MESSAGE",
        payload: JSON.stringify({ type: "DOWNLOAD_SUCCESS", id: "download-1" })
      },
      ...overrides
    }) as MessageEvent;

  it("decodes current-window messages, including opaque native origins", () => {
    expect(parseNativeMessage(message())).toEqual({
      type: "DOWNLOAD_SUCCESS",
      id: "download-1"
    });
    expect(parseNativeMessage(message({ origin: "null" }))?.id).toBe(
      "download-1"
    );
  });

  it("rejects foreign sources and origins", () => {
    expect(parseNativeMessage(message({ source: null }))).toBeUndefined();
    expect(
      parseNativeMessage(message({ origin: "https://foreign.example" }))
    ).toBeUndefined();
  });

  it("ignores unrelated, non-string, and non-object payloads", () => {
    for (const payload of [null, {}, "plain text", "[]"]) {
      expect(
        parseNativeMessage(
          message({ data: { type: "SWIFT_MESSAGE", payload } })
        )
      ).toBeUndefined();
    }
    expect(
      parseNativeMessage(message({ data: { type: "OTHER", payload: "{}" } }))
    ).toBeUndefined();
  });
});
