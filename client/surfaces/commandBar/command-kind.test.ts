import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionType } from "@nucleum/client/config/action.type";
import { generateCmdType } from "@nucleum/surfaces/commandBar/command-kind";

describe("client/surfaces/commandBar/command-kind", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("maps action types to command strings", () => {
    expect(generateCmdType(ActionType.PAGE)).toBe("page");
    expect(generateCmdType(ActionType.MODAL)).toBe("action");
    expect(generateCmdType(ActionType.FUNCTION)).toBe("action");
    expect(generateCmdType(ActionType.LINK)).toBe("link");
    expect(generateCmdType(999 as ActionType)).toBe("action");
  });
});
