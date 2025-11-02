import { describe, expect, it } from "vitest";

import {
  parse,
  replacer,
  reparse,
  stringify
} from "@21n/shared-utils/json.utils";

describe("json utils", () => {
  describe("stringify", () => {
    it("replaces undefined values with the marker by default", () => {
      const payload = { present: 42, missing: undefined };

      const serialized = stringify(payload);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual({ present: 42, missing: "$NONE" });
      expect(payload).toEqual({ present: 42, missing: undefined });
    });

    it("omits undefined values when the replacer is disabled", () => {
      const payload = { keep: "value", skip: undefined };

      const serialized = stringify(payload, { isPreventReplacer: true });
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual({ keep: "value" });
      expect(Object.prototype.hasOwnProperty.call(parsed, "skip")).toBe(false);
    });
  });

  describe("parse", () => {
    it("drops fields encoded with the undefined marker", () => {
      const revived = parse('{"present":1,"absent":"$NONE"}');

      expect(revived).toEqual({ present: 1 });
      expect(Object.prototype.hasOwnProperty.call(revived, "absent")).toBe(
        false
      );
    });
  });

  describe("replacer", () => {
    it("renames keys and replaces string fragments deeply", () => {
      const input = {
        key: "foo://example",
        nested: { key: "foo://nested" },
        list: ["foo://list", { key: "foo://object" }]
      };

      const output = replacer(input, {
        key: "alias",
        "foo://": "bar://"
      });

      expect(output).toEqual({
        alias: "bar://example",
        nested: { alias: "bar://nested" },
        list: ["bar://list", { alias: "bar://object" }]
      });

      expect(output).not.toBe(input);
      expect(output.nested).not.toBe(input.nested);
    });
  });

  describe("reparse", () => {
    it("creates a deep JSON clone while stripping undefined values", () => {
      const source = {
        keep: { value: 7 },
        list: [1, 2, { flag: true }],
        remove: undefined
      };

      const cloned = reparse(source);

      expect(cloned).toEqual({ keep: { value: 7 }, list: [1, 2, { flag: true }] });
      expect(cloned).not.toBe(source);
      expect(cloned.keep).not.toBe(source.keep);
    });
  });
});
