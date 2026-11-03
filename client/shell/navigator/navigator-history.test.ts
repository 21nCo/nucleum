import { describe, expect, it } from "vitest";
import {
  NAVIGATOR_HISTORY_DUPLICATE_MS,
  NAVIGATOR_HISTORY_MAX_ENTRIES,
  NAVIGATOR_HISTORY_MAX_OPENS,
  NAVIGATOR_HISTORY_MAX_ORIGINS,
  NAVIGATOR_HISTORY_WINDOW_MS,
  createNavigatorHistory,
  normalizeNavigatorHistory,
  pruneNavigatorHistory,
  rankNavigatorHistory,
  rankNavigatorHistoryFrom,
  recordNavigatorVisit,
  type NavigatorHistory
} from "./navigator-history";

const now = Date.UTC(2026, 10, 3);
const day = 24 * 60 * 60 * 1000;

function visitMany(
  history: NavigatorHistory,
  id: string,
  times: number[],
  origin?: string
) {
  return times.reduce(
    (current, at) =>
      recordNavigatorVisit(current, {
        id,
        kind: id.includes(":") ? "resource" : "page",
        at,
        origin
      }),
    history
  );
}

describe("recordNavigatorVisit", () => {
  it("records opens, last opened time and origin counts", () => {
    let history = createNavigatorHistory();
    history = recordNavigatorVisit(history, {
      id: "node:b",
      kind: "resource",
      at: now - 10_000,
      origin: "node:a"
    });
    history = recordNavigatorVisit(history, {
      id: "node:b",
      kind: "resource",
      at: now,
      origin: "node:a"
    });

    expect(history.entries["node:b"]).toEqual({
      kind: "resource",
      opens: [now - 10_000, now],
      lastOpenedAt: now,
      from: { "node:a": [now - 10_000, now] }
    });
  });

  it("ignores a repeat of the same id inside the duplicate window", () => {
    const first = recordNavigatorVisit(createNavigatorHistory(), {
      id: "calendar/classic/year",
      kind: "page",
      at: now
    });
    const repeat = recordNavigatorVisit(first, {
      id: "calendar/classic/year",
      kind: "page",
      at: now + NAVIGATOR_HISTORY_DUPLICATE_MS - 1
    });

    expect(repeat).toBe(first);
    expect(repeat.entries["calendar/classic/year"].opens).toHaveLength(1);
  });

  it("does not count a record as its own origin", () => {
    const history = recordNavigatorVisit(createNavigatorHistory(), {
      id: "node:a",
      kind: "resource",
      at: now,
      origin: "node:a"
    });

    expect(history.entries["node:a"].from).toEqual({});
  });

  it("caps opens per entry", () => {
    const times = Array.from(
      { length: NAVIGATOR_HISTORY_MAX_OPENS + 20 },
      (_, index) => now - index * NAVIGATOR_HISTORY_DUPLICATE_MS * 2
    ).reverse();
    const history = visitMany(createNavigatorHistory(), "node:a", times);

    expect(history.entries["node:a"].opens).toHaveLength(
      NAVIGATOR_HISTORY_MAX_OPENS
    );
    expect(history.entries["node:a"].opens.at(-1)).toBe(now);
  });
});

describe("pruneNavigatorHistory", () => {
  it("drops opens older than 90 days and entries left without opens", () => {
    const history: NavigatorHistory = {
      version: 1,
      entries: {
        "node:old": {
          kind: "resource",
          opens: [now - NAVIGATOR_HISTORY_WINDOW_MS - day],
          lastOpenedAt: now - NAVIGATOR_HISTORY_WINDOW_MS - day,
          from: {}
        },
        "node:mixed": {
          kind: "resource",
          opens: [now - NAVIGATOR_HISTORY_WINDOW_MS - day, now - day],
          lastOpenedAt: now - day,
          from: {}
        }
      }
    };

    const pruned = pruneNavigatorHistory(history, now);

    expect(Object.keys(pruned.entries)).toEqual(["node:mixed"]);
    expect(pruned.entries["node:mixed"].opens).toEqual([now - day]);
  });

  it("keeps only the highest-ranked entries over the entry cap", () => {
    const entries: NavigatorHistory["entries"] = {};
    for (let index = 0; index < NAVIGATOR_HISTORY_MAX_ENTRIES + 5; index++) {
      entries[`node:${index}`] = {
        kind: "resource",
        opens: [now - index * 1000],
        lastOpenedAt: now - index * 1000,
        from: {}
      };
    }
    entries["node:frequent"] = {
      kind: "resource",
      opens: [now - 3 * day, now - 2 * day],
      lastOpenedAt: now - 2 * day,
      from: {}
    };

    const pruned = pruneNavigatorHistory({ version: 1, entries }, now);
    const ids = Object.keys(pruned.entries);

    expect(ids).toHaveLength(NAVIGATOR_HISTORY_MAX_ENTRIES);
    expect(ids).toContain("node:frequent");
    expect(ids).toContain("node:0");
    expect(ids).not.toContain(`node:${NAVIGATOR_HISTORY_MAX_ENTRIES + 4}`);
  });
});

describe("rankNavigatorHistory", () => {
  it("ranks by opens in the window and breaks ties by recency", () => {
    let history = createNavigatorHistory();
    history = visitMany(history, "node:a", [now - 3 * day, now - 2 * day]);
    history = visitMany(history, "node:b", [now - 5 * day]);
    history = visitMany(history, "calendar/classic/year", [now - day]);
    history = visitMany(history, "overview/graph", [
      now - 4 * day,
      now - 3 * day,
      now - 2 * day
    ]);

    expect(rankNavigatorHistory(history, now).map((item) => item.id)).toEqual([
      "overview/graph",
      "node:a",
      "calendar/classic/year",
      "node:b"
    ]);
    expect(rankNavigatorHistory(history, now, 2)).toHaveLength(2);
  });

  it("ignores opens outside the window when scoring", () => {
    const history: NavigatorHistory = {
      version: 1,
      entries: {
        "node:a": {
          kind: "resource",
          opens: [now - NAVIGATOR_HISTORY_WINDOW_MS - 1, now - day],
          lastOpenedAt: now - day,
          from: {}
        },
        "node:b": {
          kind: "resource",
          opens: [now - 3 * day],
          lastOpenedAt: now - 3 * day,
          from: {}
        }
      }
    };

    expect(rankNavigatorHistory(history, now)).toEqual([
      { id: "node:a", entry: history.entries["node:a"], score: 1 },
      { id: "node:b", entry: history.entries["node:b"], score: 1 }
    ]);
  });
});

describe("rankNavigatorHistoryFrom", () => {
  it("returns entries opened from the origin ordered by count", () => {
    let history = createNavigatorHistory();
    history = visitMany(history, "node:b", [now - 3 * day], "node:a");
    history = visitMany(
      history,
      "node:c",
      [now - 5 * day, now - 4 * day],
      "node:a"
    );
    history = visitMany(history, "node:d", [now - day], "node:x");

    expect(
      rankNavigatorHistoryFrom(history, "node:a", now).map((item) => [
        item.id,
        item.score
      ])
    ).toEqual([
      ["node:c", 2],
      ["node:b", 1]
    ]);
    expect(rankNavigatorHistoryFrom(history, "node:z", now)).toEqual([]);
  });
});

describe("normalizeNavigatorHistory", () => {
  it("returns an empty history for unknown versions and malformed values", () => {
    expect(normalizeNavigatorHistory(undefined)).toEqual(
      createNavigatorHistory()
    );
    expect(normalizeNavigatorHistory({ version: 2, entries: {} })).toEqual(
      createNavigatorHistory()
    );
  });

  it("drops malformed entries and invalid counts", () => {
    const history = normalizeNavigatorHistory({
      version: 1,
      entries: {
        "node:a": {
          kind: "resource",
          opens: [now, "x"],
          lastOpenedAt: now,
          from: { "node:b": [now], "node:c": ["x"] }
        },
        "node:b": { kind: "other", opens: [now] },
        "node:c": null
      }
    });

    expect(history.entries).toEqual({
      "node:a": {
        kind: "resource",
        opens: [now],
        lastOpenedAt: now,
        from: { "node:b": [now] }
      }
    });
  });
});

describe("navigator history caps", () => {
  it("keeps a newly opened entry when the history is full of frequent entries", () => {
    let history = createNavigatorHistory();
    for (let index = 0; index < NAVIGATOR_HISTORY_MAX_ENTRIES; index++) {
      history = visitMany(history, `node:${index}`, [
        now - 3 * day - index * 10_000,
        now - 2 * day - index * 10_000
      ]);
    }
    history = visitMany(history, "node:new", [now - day]);
    expect(history.entries["node:new"]).toBeDefined();
    expect(Object.keys(history.entries)).toHaveLength(
      NAVIGATOR_HISTORY_MAX_ENTRIES
    );

    history = visitMany(history, "node:new", [now]);
    expect(history.entries["node:new"].opens).toEqual([now - day, now]);
  });

  it("keeps a new origin when an entry already has the maximum origins", () => {
    let history = createNavigatorHistory();
    for (let index = 0; index < NAVIGATOR_HISTORY_MAX_ORIGINS; index++) {
      history = visitMany(
        history,
        "node:b",
        [now - 3 * day - index * 10_000, now - 2 * day - index * 10_000],
        `node:origin${index}`
      );
    }
    history = visitMany(history, "node:b", [now], "node:new");

    expect(history.entries["node:b"].from["node:new"]).toEqual([now]);
    expect(Object.keys(history.entries["node:b"].from)).toHaveLength(
      NAVIGATOR_HISTORY_MAX_ORIGINS
    );
    expect(
      rankNavigatorHistoryFrom(history, "node:new", now).map((item) => item.id)
    ).toEqual(["node:b"]);
  });

  it("expires origin opens with the ranking window", () => {
    let history = visitMany(
      createNavigatorHistory(),
      "node:b",
      [now],
      "node:a"
    );
    const later = now + NAVIGATOR_HISTORY_WINDOW_MS + day;
    history = visitMany(history, "node:b", [later], "node:x");

    expect(history.entries["node:b"].from).toEqual({ "node:x": [later] });
    expect(rankNavigatorHistoryFrom(history, "node:a", later)).toEqual([]);
    expect(
      rankNavigatorHistoryFrom(history, "node:x", later).map((item) => item.id)
    ).toEqual(["node:b"]);
  });

  it("does not rank origin opens that left the window before pruning", () => {
    const history = visitMany(
      createNavigatorHistory(),
      "node:b",
      [now],
      "node:a"
    );

    expect(
      rankNavigatorHistoryFrom(
        history,
        "node:a",
        now + NAVIGATOR_HISTORY_WINDOW_MS + 1
      )
    ).toEqual([]);
  });
});
