import { describe, expect, it } from "vitest";
import { resolveLiftedEventTimes } from "./legacy-event-times";

describe("resolveLiftedEventTimes", () => {
  it("lifts times kept only inside value", () => {
    expect(
      resolveLiftedEventTimes({ value: { startUnix: 10, endUnix: 20 } })
    ).toEqual({ startUnix: 10, endUnix: 20 });
    expect(resolveLiftedEventTimes({ value: { startUnix: 10 } })).toEqual({
      startUnix: 10
    });
  });

  it("leaves top-level times alone and skips events with nothing to lift", () => {
    expect(
      resolveLiftedEventTimes({ startUnix: 5, value: { startUnix: 10 } })
    ).toBeUndefined();
    expect(resolveLiftedEventTimes({ value: { endUnix: 20 } })).toBeUndefined();
    expect(resolveLiftedEventTimes({ value: "text" })).toBeUndefined();
    expect(resolveLiftedEventTimes({})).toBeUndefined();
  });
});
