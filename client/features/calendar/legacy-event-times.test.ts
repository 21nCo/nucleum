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

  it("lifts a missing end even when the start is already top-level", () => {
    expect(
      resolveLiftedEventTimes({
        startUnix: 10,
        value: { startUnix: 10, endUnix: 99 }
      })
    ).toEqual({ endUnix: 99 });
  });

  it("leaves top-level times alone and skips events with nothing to lift", () => {
    expect(
      resolveLiftedEventTimes({ startUnix: 5, value: { startUnix: 10 } })
    ).toBeUndefined();
    expect(
      resolveLiftedEventTimes({
        startUnix: 10,
        endUnix: 30,
        value: { endUnix: 20 }
      })
    ).toBeUndefined();
    expect(resolveLiftedEventTimes({ value: "text" })).toBeUndefined();
    expect(resolveLiftedEventTimes({})).toBeUndefined();
  });
});
