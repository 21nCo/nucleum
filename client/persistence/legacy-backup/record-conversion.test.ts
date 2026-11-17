import { describe, expect, it } from "vitest";
import { convertLegacyResourceRecord } from "./record-conversion";

describe("legacy event conversion", () => {
  it("lifts event times kept inside value to the top-level fields", () => {
    const converted = convertLegacyResourceRecord(
      "event",
      {
        id: "event:a",
        event: "meeting",
        value: { startUnix: 1_700_000_000_000, endUnix: 1_700_000_360_000 }
      },
      "event"
    );
    expect(converted?.startUnix).toBe(1_700_000_000_000);
    expect(converted?.endUnix).toBe(1_700_000_360_000);
  });

  it("keeps top-level event times over the legacy value", () => {
    const converted = convertLegacyResourceRecord(
      "event",
      {
        id: "event:b",
        event: "meeting",
        startUnix: 1,
        endUnix: 2,
        value: { startUnix: 10, endUnix: 20 }
      },
      "event"
    );
    expect(converted?.startUnix).toBe(1);
    expect(converted?.endUnix).toBe(2);
  });
});
