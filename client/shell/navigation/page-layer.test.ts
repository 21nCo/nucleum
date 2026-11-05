import { afterEach, describe, expect, it } from "vitest";
import { PAGE_LAYER_ATTRIBUTE, resolvePageLayer } from "./page-layer";

function layer() {
  const element = document.createElement("div");
  element.setAttribute(PAGE_LAYER_ATTRIBUTE, "");
  return element;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("resolvePageLayer", () => {
  it("is undefined without an opened page", () => {
    document.body.append(document.createElement("div"));
    expect(resolvePageLayer()).toBeUndefined();
  });

  it("resolves the topmost opened page layer", () => {
    const lower = layer();
    const upper = layer();
    document.body.append(lower, upper);
    expect(resolvePageLayer()).toBe(upper);
  });
});
