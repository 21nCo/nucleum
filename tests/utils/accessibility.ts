import axe from "axe-core";
import { expect } from "vitest";

export async function expectAccessible(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      "landmark-one-main": { enabled: false }
    }
  });

  expect(results.violations).toEqual([]);
}
