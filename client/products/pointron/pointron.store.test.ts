import { describe, expect, it, vi } from "vitest";

vi.mock("@21n/components/flux/flux", () => ({
  flux: {
    kvMerge: vi.fn()
  }
}));

vi.mock("@21n/utils/browser.utils", async () => {
  const actual = await vi.importActual<typeof import("@21n/utils/browser.utils")>(
    "@21n/utils/browser.utils"
  );

  return {
    ...actual,
    isExtensionEnvironment: () => false
  };
});

const { pointronPreferences, defaultHorizonChartConfiguration } = await import(
  "./pointron.store"
);

describe("pointron preferences store", () => {
  it("resets horizon charts to defaults", async () => {
    await pointronPreferences.modify(
      { horizonCharts: [] },
      { isPersist: false }
    );

    await pointronPreferences.resetHorizonChartConfiguration();

    expect(pointronPreferences.get().horizonCharts).toEqual(
      defaultHorizonChartConfiguration
    );
  });

  it("updates manual quick durations deterministically", async () => {
    const durations = [5, 25, 45];

    await pointronPreferences.updateManualEntryQuickDurations(durations);

    expect(pointronPreferences.get().manualEntryQuickDurations).toEqual(
      durations
    );
  });
});
