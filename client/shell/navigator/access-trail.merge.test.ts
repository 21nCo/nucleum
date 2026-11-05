import { describe, expect, it } from "vitest";
import {
  createAccessTrails,
  mergeAccessTrails,
  resumeAccessTrail,
  type AccessTrail,
  type AccessTrails
} from "./access-trail";

function trail(key: string, ids: string[], updatedAt: number): AccessTrail {
  return {
    key,
    nodes: ids.map((id, index) => ({
      id,
      key: `${key}:${index}`,
      parent: index - 1
    })),
    active: ids.length - 1,
    startedAt: 0,
    updatedAt
  };
}

function trails(current: AccessTrail | undefined, recent: AccessTrail[]) {
  return {
    ...createAccessTrails(),
    ...(current ? { current } : {}),
    recent
  } satisfies AccessTrails;
}

const keys = (list: AccessTrail[]) => list.map((item) => item.key);

describe("mergeAccessTrails", () => {
  it("keeps trails another window saved and lists its current trail as recent", () => {
    const mine = trail("mine", ["node:a", "node:b"], 30);
    const local = trails(mine, [trail("old", ["node:c", "node:d"], 10)]);
    const stored = trails(trail("theirs", ["node:e", "node:f"], 40), [
      trail("saved", ["node:g", "node:h"], 20)
    ]);

    const merged = mergeAccessTrails(local, stored);

    expect(merged.current).toBe(mine);
    expect(keys(merged.recent)).toEqual(["theirs", "saved", "old"]);
  });

  it("keeps the most recently updated copy of a trail", () => {
    const older = trail("shared", ["node:a", "node:b"], 10);
    const newer = { ...trail("shared", ["node:a", "node:c"], 50), active: 0 };
    const fromStored = mergeAccessTrails(
      trails(undefined, [older]),
      trails(undefined, [newer])
    );
    const fromLocal = mergeAccessTrails(
      trails(undefined, [newer]),
      trails(undefined, [older])
    );

    expect(fromStored.recent).toEqual([newer]);
    expect(fromLocal.recent).toEqual([newer]);
  });

  it("keeps this window's current trail over another window's copy of it", () => {
    const mine = trail("shared", ["node:a", "node:b"], 10);
    const theirs = trail("shared", ["node:a", "node:c"], 50);

    const merged = mergeAccessTrails(trails(mine, []), trails(theirs, []));

    expect(merged.current).toBe(mine);
    expect(merged.recent).toEqual([]);
  });

  it("leaves a resumed trail out of the recent trails saved elsewhere", () => {
    const resumable = trail("resumed", ["node:a", "node:b"], 10);
    const other = trail("other", ["node:c", "node:d"], 20);
    const local = resumeAccessTrail(
      trails(undefined, [resumable, other]),
      "resumed",
      60
    );
    const stored = trails(trail("theirs", ["node:e", "node:f"], 30), [
      resumable,
      other
    ]);

    const merged = mergeAccessTrails(local, stored);

    expect(merged.current?.key).toBe("resumed");
    expect(keys(merged.recent)).toEqual(["theirs", "other"]);
  });
});
