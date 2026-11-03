import { describe, expect, it } from "vitest";
import {
  createNavigatorHistory,
  rankNavigatorHistoryByRecency,
  recordNavigatorVisit
} from "./navigator-history";

const now = Date.UTC(2026, 10, 3);
const minute = 60 * 1000;

describe("rankNavigatorHistoryByRecency", () => {
  it("orders entries by last open, newest first, and applies the limit", () => {
    let history = createNavigatorHistory();
    history = recordNavigatorVisit(history, {
      id: "node:a",
      kind: "resource",
      at: now - 10 * minute
    });
    history = recordNavigatorVisit(history, {
      id: "calendar",
      kind: "page",
      at: now - 5 * minute
    });
    history = recordNavigatorVisit(history, {
      id: "node:b",
      kind: "resource",
      at: now - 20 * minute
    });
    history = recordNavigatorVisit(history, {
      id: "node:b",
      kind: "resource",
      at: now - minute
    });

    expect(rankNavigatorHistoryByRecency(history).map((x) => x.id)).toEqual([
      "node:b",
      "calendar",
      "node:a"
    ]);
    expect(rankNavigatorHistoryByRecency(history, 2).map((x) => x.id)).toEqual([
      "node:b",
      "calendar"
    ]);
  });

  it("returns nothing for an empty history", () => {
    expect(rankNavigatorHistoryByRecency(createNavigatorHistory())).toEqual([]);
  });
});
