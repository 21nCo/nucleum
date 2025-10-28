import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  deepCopy,
  deepDiff,
  removeDuplicatesById
} from "@21n/shared-utils/obj.utils";

describe("obj.utils property-based checks", () => {
  it("deepDiff returns empty array when comparing equal objects", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const diff = deepDiff(value, value);
        expect(Array.isArray(diff)).toBe(true);
        expect(diff).toHaveLength(0);
      })
    );
  });

  it("deepCopy produces structurally equal but distinct objects", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const copy = deepCopy(value);
        const normalizedValue = JSON.parse(JSON.stringify(value));
        expect(copy).toEqual(normalizedValue);
        if (value && typeof value === "object") {
          expect(copy).not.toBe(value);
        }
      })
    );
  });

  it("removeDuplicatesById always preserves the first occurrence of each id", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.oneof(fc.uuid(), fc.integer(), fc.string()),
            value: fc.anything()
          })
        ),
        (items) => {
          const deduped = removeDuplicatesById(items);
          const seen = new Set();

          deduped.forEach((item) => {
            expect(seen.has(item.id)).toBe(false);
            seen.add(item.id);
          });

          items.forEach((item) => {
            const firstIndex = items.findIndex((candidate) => candidate.id === item.id);
            if (firstIndex === items.indexOf(item)) {
              expect(deduped.find((candidate) => candidate.id === item.id)).toEqual(item);
            }
          });
        }
      )
    );
  });
});
