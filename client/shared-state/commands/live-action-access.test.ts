import { describe, expect, it, vi } from "vitest";
import { AccessMode } from "@nucleum/datafn/resource.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";

const saved = vi.hoisted(() => ({ mode: undefined as string | undefined }));

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => saved.mode, setState: () => undefined }
}));

const { isRightPanelSheet, resolveEffectiveLiveActionAccessMode } =
  await import("./live-action-access");

const capture = {
  action: "capture",
  accessMode: AccessMode.OVERLAY,
  liveActionParams: { isOpeningBehaviorConfigurable: true }
} as unknown as IAction;

const navigator = {
  action: "navigator",
  accessMode: AccessMode.PANEL
} as unknown as IAction;

const wide = { isPortrait: false, isConstrainedWidth: false };
const constrainedLandscape = { isPortrait: false, isConstrainedWidth: true };
const portrait = { isPortrait: true, isConstrainedWidth: true };

describe("resolveEffectiveLiveActionAccessMode", () => {
  it("opens a right panel preference in the panel where it can render", () => {
    saved.mode = AccessMode.PANEL;
    expect(resolveEffectiveLiveActionAccessMode(capture, wide)).toBe(
      AccessMode.PANEL
    );
    expect(resolveEffectiveLiveActionAccessMode(capture, portrait)).toBe(
      AccessMode.PANEL
    );
  });

  it("opens a right panel preference as an overlay on a constrained landscape view", () => {
    saved.mode = AccessMode.PANEL;
    expect(
      resolveEffectiveLiveActionAccessMode(capture, constrainedLandscape)
    ).toBe(AccessMode.OVERLAY);
  });

  it("opens a panel-by-default action as an overlay on a constrained landscape view", () => {
    saved.mode = undefined;
    expect(
      resolveEffectiveLiveActionAccessMode(navigator, constrainedLandscape)
    ).toBe(AccessMode.OVERLAY);
    expect(resolveEffectiveLiveActionAccessMode(navigator, wide)).toBe(
      AccessMode.PANEL
    );
  });

  it("keeps an overlay preference as it is", () => {
    saved.mode = AccessMode.OVERLAY;
    expect(
      resolveEffectiveLiveActionAccessMode(capture, constrainedLandscape)
    ).toBe(AccessMode.OVERLAY);
  });
});

describe("isRightPanelSheet", () => {
  it("shows the panel as a sheet wherever it cannot render beside the page", () => {
    expect(isRightPanelSheet(wide)).toBe(false);
    expect(isRightPanelSheet(portrait)).toBe(true);
    expect(isRightPanelSheet(constrainedLandscape)).toBe(true);
  });
});
