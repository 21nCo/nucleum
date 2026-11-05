import { get } from "svelte/store";
import { afterEach, describe, expect, it } from "vitest";

import colorSchemes from "@21n/theme/colorschemes.json";
import { AppStyle, resolveAppStyleTokens } from "@21n/theme/app-style";
import type { ColorScheme } from "@21n/theme/appearance.type";
import {
  elementControlShape,
  isBoxedCell,
  resolveControlShape
} from "@21n/ui/environment/control-shape";
import { syncElementAppearance } from "@21n/ui/environment/element-environment.store";

const colorScheme = colorSchemes[0] as ColorScheme;

describe("resolveControlShape", () => {
  it("keeps boxed controls unframed with the medium radius", () => {
    expect(resolveControlShape(AppStyle.Boxed)).toEqual({
      isFramed: false,
      isRounded: false,
      radiusClass: "rounded-md"
    });
  });

  it("frames semi-rounded controls with the medium radius", () => {
    expect(resolveControlShape(AppStyle.Semi)).toEqual({
      isFramed: true,
      isRounded: false,
      radiusClass: "rounded-md"
    });
  });

  it("frames rounded controls as pills", () => {
    expect(resolveControlShape(AppStyle.Rounded)).toEqual({
      isFramed: true,
      isRounded: true,
      radiusClass: "rounded-full"
    });
  });

  it("treats unknown styles as boxed", () => {
    expect(resolveControlShape("pill").isFramed).toBe(false);
  });

  it("matches the control radius token of every app style", () => {
    const radiusByClass = {
      "rounded-md": "0.375rem",
      "rounded-full": "9999px"
    };
    for (const style of Object.values(AppStyle)) {
      expect(radiusByClass[resolveControlShape(style).radiusClass]).toBe(
        resolveAppStyleTokens(style)["--app-control-radius"]
      );
    }
  });
});

describe("isBoxedCell", () => {
  it("draws cells only in the boxed style", () => {
    expect(isBoxedCell(true, resolveControlShape(AppStyle.Boxed))).toBe(true);
    expect(isBoxedCell(true, resolveControlShape(AppStyle.Semi))).toBe(false);
    expect(isBoxedCell(true, resolveControlShape(AppStyle.Rounded))).toBe(
      false
    );
    expect(isBoxedCell(false, resolveControlShape(AppStyle.Boxed))).toBe(false);
  });
});

describe("elementControlShape", () => {
  afterEach(() => {
    syncElementAppearance({ colorScheme, appStyle: AppStyle.Boxed });
  });

  it("follows the app style supplied by the host", () => {
    syncElementAppearance({ colorScheme, appStyle: AppStyle.Rounded });
    expect(get(elementControlShape).isRounded).toBe(true);
    syncElementAppearance({ colorScheme, appStyle: AppStyle.Semi });
    expect(get(elementControlShape)).toMatchObject({
      isFramed: true,
      isRounded: false
    });
  });
});
