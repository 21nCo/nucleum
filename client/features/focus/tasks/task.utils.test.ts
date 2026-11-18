import { describe, expect, it } from "vitest";
import { evaluateFilter } from "@datafn/core";
import {
  createTaskNumberFieldNormalizer,
  normalizeTaskNumberFields,
  resolveTaskWithoutDueDateFilter,
  resolveTaskWithoutObjectiveFilter
} from "./task.utils";

/** A task as a direct-mode read returns it: number fields may be numeric strings. */
type DirectModeTask = { id: string; dateUnix: number | string };

describe("client/features/focus/tasks/task.utils", () => {
  describe("resolveTaskWithoutDueDateFilter", () => {
    const filters = { dateUnix: resolveTaskWithoutDueDateFilter() };

    it("matches tasks stored without a date", () => {
      expect(evaluateFilter({ id: "a", dateUnix: 0 }, filters)).toBe(true);
      expect(evaluateFilter({ id: "b", dateUnix: null }, filters)).toBe(true);
    });

    it("does not match dated tasks", () => {
      expect(
        evaluateFilter({ id: "c", dateUnix: 1_794_700_000_000 }, filters)
      ).toBe(false);
    });

    it("is not a boolean equality, which Postgres rejects for numeric columns", () => {
      expect(typeof filters.dateUnix).toBe("object");
      expect(Object.values(filters.dateUnix)).not.toContain(false);
    });
  });

  describe("resolveTaskWithoutObjectiveFilter", () => {
    const filters = { objectiveId: resolveTaskWithoutObjectiveFilter() };

    it("matches tasks with an empty or missing objective", () => {
      expect(evaluateFilter({ id: "a", objectiveId: "" }, filters)).toBe(true);
      expect(evaluateFilter({ id: "b", objectiveId: null }, filters)).toBe(
        true
      );
      expect(evaluateFilter({ id: "c" }, filters)).toBe(true);
    });

    it("does not match tasks with an objective", () => {
      expect(
        evaluateFilter({ id: "d", objectiveId: "objective:1" }, filters)
      ).toBe(false);
    });
  });

  describe("normalizeTaskNumberFields", () => {
    it("converts numeric strings from direct-mode reads to numbers", () => {
      const record = normalizeTaskNumberFields({
        id: "a",
        dateUnix: "1794700000000",
        completedAtUnix: "1794700000001",
        estimated: "25",
        minutes: "12.5"
      });
      expect(record).toMatchObject({
        dateUnix: 1_794_700_000_000,
        completedAtUnix: 1_794_700_000_001,
        estimated: 25,
        minutes: 12.5
      });
      expect(new Date(record.dateUnix).getTime()).toBe(1_794_700_000_000);
    });

    it("turns a zero date string into 0 so it reads as no date", () => {
      const record: DirectModeTask = { id: "a", dateUnix: "0" };
      expect(normalizeTaskNumberFields(record).dateUnix).toBe(0);
    });

    it("leaves numbers, nulls, blanks and non-numeric strings alone", () => {
      const record = {
        id: "a",
        dateUnix: 5,
        completedAtUnix: null,
        estimated: "",
        minutes: "soon"
      };
      expect(normalizeTaskNumberFields(record)).toBe(record);
    });

    it("does not change the record it is given", () => {
      const record = { id: "a", dateUnix: "7" };
      const result = normalizeTaskNumberFields(record);
      expect(result).not.toBe(record);
      expect(record.dateUnix).toBe("7");
    });
  });

  describe("createTaskNumberFieldNormalizer", () => {
    it("returns the same copy for the same record", () => {
      const normalize = createTaskNumberFieldNormalizer();
      const record: DirectModeTask = { id: "a", dateUnix: "7" };
      expect(normalize(record)).toBe(normalize(record));
      expect(normalize(record).dateUnix).toBe(7);
    });

    it("returns records that need no conversion as they are", () => {
      const normalize = createTaskNumberFieldNormalizer();
      const record = { id: "a", dateUnix: 7 };
      expect(normalize(record)).toBe(record);
    });

    it("does not share copies between normalizers", () => {
      const record = { id: "a", dateUnix: "7" };
      expect(createTaskNumberFieldNormalizer()(record)).not.toBe(
        createTaskNumberFieldNormalizer()(record)
      );
    });
  });
});
