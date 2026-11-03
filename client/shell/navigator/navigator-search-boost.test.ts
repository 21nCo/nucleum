import { describe, expect, it } from "vitest";
import { rankResourceSearchMatches } from "@nucleum/shared-state/resources/resource-search";
import {
  createNavigatorHistory,
  navigatorSearchBoost,
  recordNavigatorVisit
} from "./navigator-history";

const now = Date.UTC(2026, 10, 3);
const day = 24 * 60 * 60 * 1000;

function visit(
  history: ReturnType<typeof createNavigatorHistory>,
  id: string,
  at: number
) {
  return recordNavigatorVisit(history, { id, kind: "resource", at });
}

describe("navigatorSearchBoost", () => {
  it("gives unopened records no boost", () => {
    expect(navigatorSearchBoost(createNavigatorHistory(), now)("node:x")).toBe(
      0
    );
  });

  it("boosts frequently and recently opened records more", () => {
    let history = createNavigatorHistory();
    for (let index = 0; index < 5; index++) {
      history = visit(history, "node:frequent", now - (index + 1) * day);
    }
    history = visit(history, "node:once", now - 60 * day);
    const boost = navigatorSearchBoost(history, now);
    expect(boost("node:frequent")).toBeGreaterThan(boost("node:once"));
    expect(boost("node:once")).toBeGreaterThan(0);
  });

  it("reorders equally relevant search results by navigator history", () => {
    const history = visit(createNavigatorHistory(), "node:b", now - day);
    const matches = [
      {
        id: "node:a",
        resource: "node",
        score: 1,
        data: { id: "node:a", label: "Plan A" }
      },
      {
        id: "node:b",
        resource: "node",
        score: 1,
        data: { id: "node:b", label: "Plan B" }
      }
    ];
    expect(rankResourceSearchMatches(matches, "plan")[0].id).toBe("node:a");
    expect(
      rankResourceSearchMatches(
        matches,
        "plan",
        navigatorSearchBoost(history, now)
      )[0].id
    ).toBe("node:b");
  });
});
