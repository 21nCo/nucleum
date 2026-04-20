import { expect, test } from "@playwright/test";
import {
  buildCoverageMatrixRows,
  getCoverageSuitesForArea,
  getCoverageSuitesForLayer,
  getDocumentedProductNames,
  getSmokeAndFeatureTags,
  getSurfaceContractsReferenced
} from "../utils/coverage";
import {
  E2EContractError,
  getCapabilitySkipReason,
  getCommandLabelOrThrow,
  requireCapability
} from "../utils/capabilities";
import { getSurfaceContract } from "../utils/surface-contracts";
import { getE2EProductConfigFromProjectName } from "../../config/product-nav.config";

const areas = ["calendar", "overview", "focus", "library", "settings"] as const;

test.describe("@config-contract foundation", () => {
  test("@config-contract product configs expose documented products", () => {
    expect(getDocumentedProductNames()).toEqual(["nucleus", "memotron", "pointron"]);
  });

  test("@config-contract capability helpers fail loudly for missing paths", () => {
    expect(() => requireCapability("nucleus", "records.missing")).toThrow(
      E2EContractError
    );
  });

  test("@config-contract capability helpers provide config-based skip reasons", () => {
    expect(getCapabilitySkipReason("memotron", "overview.focusAnalyticsDashboard")).toContain(
      "disabled by product config"
    );
  });

  test("@config-contract direct command labels are separated from resource labels", () => {
    expect(() => getCommandLabelOrThrow("nucleus", "libraryGoals")).toThrow(
      E2EContractError
    );
    expect(getCommandLabelOrThrow("pointron", "libraryGoals")).toBe("Goals");
  });
});

test.describe("@config-contract @calendar-feature calendar contract scaffolding", () => {
  test("@config-contract calendar area has smoke and feature suite definitions", () => {
    const suites = getCoverageSuitesForArea("calendar");
    expect(suites.some((suite) => suite.layer === "smoke")).toBe(true);
    expect(suites.some((suite) => suite.layer === "feature")).toBe(true);
  });

  test("@config-contract calendar surface contracts exist where documented", () => {
    const surfaceKeys = getSurfaceContractsReferenced().calendar;
    expect(getSurfaceContract("nucleus", surfaceKeys[0])).toBeTruthy();
    expect(getSurfaceContract("pointron", surfaceKeys[0])).toBeTruthy();
    expect(getSurfaceContract("nucleus", "calendar.layout.bird")).toBeTruthy();
    expect(getSurfaceContract("memotron", "calendar.view.year")).toBeTruthy();
  });

  test("@config-contract calendar capabilities reflect the documented product matrix", () => {
    const nucleus = getE2EProductConfigFromProjectName("nucleus");
    const memotron = getE2EProductConfigFromProjectName("memotron");
    const pointron = getE2EProductConfigFromProjectName("pointron");

    expect(nucleus.capabilities.calendar.layouts.bird).toBe(true);
    expect(nucleus.capabilities.calendar.views.day).toBe(true);
    expect(memotron.capabilities.calendar.views.day).toBe(true);
    expect(memotron.capabilities.calendar.views.month).toBe(true);
    expect(memotron.capabilities.calendar.rightPanel.enabled).toBe(false);
    expect(pointron.capabilities.calendar.rightPanel.enabled).toBe(false);
  });
});

test.describe("@config-contract @overview-feature overview contract scaffolding", () => {
  test("@config-contract overview area has smoke and feature suite definitions", () => {
    const suites = getCoverageSuitesForArea("overview");
    expect(suites.some((suite) => suite.layer === "smoke")).toBe(true);
    expect(suites.some((suite) => suite.layer === "feature")).toBe(true);
  });

  test("@config-contract overview capabilities expose tab contracts", () => {
    expect(
      getE2EProductConfigFromProjectName("nucleus").capabilities.overview.tabs.all
    ).toBe(true);
    expect(
      getE2EProductConfigFromProjectName("memotron").capabilities.overview.tabs.all
    ).toBe(false);
  });
});

test.describe("@config-contract @focus-feature focus contract scaffolding", () => {
  test("@config-contract focus area has smoke and feature suite definitions", () => {
    const suites = getCoverageSuitesForArea("focus");
    expect(suites.some((suite) => suite.layer === "smoke")).toBe(true);
    expect(suites.some((suite) => suite.layer === "feature")).toBe(true);
  });

  test("@config-contract quick focus surface contract is only defined for pointron", () => {
    expect(() => getSurfaceContract("nucleus", "focus.quickFocus")).toThrow(
      E2EContractError
    );
    expect(getSurfaceContract("pointron", "focus.quickFocus")).toBeTruthy();
  });
});

test.describe("@config-contract @library-feature library contract scaffolding", () => {
  test("@config-contract library area has smoke and feature suite definitions", () => {
    const suites = getCoverageSuitesForArea("library");
    expect(suites.some((suite) => suite.layer === "smoke")).toBe(true);
    expect(suites.some((suite) => suite.layer === "feature")).toBe(true);
  });

  test("@config-contract library resource contracts match product availability", () => {
    const memotron = getE2EProductConfigFromProjectName("memotron");
    expect(memotron.resources.browse.includes("node")).toBe(true);
    expect(memotron.resources.browse.includes("goal")).toBe(false);
  });
});

test.describe("@config-contract @settings-feature settings contract scaffolding", () => {
  test("@config-contract settings area has smoke and feature suite definitions", () => {
    const suites = getCoverageSuitesForArea("settings");
    expect(suites.some((suite) => suite.layer === "smoke")).toBe(true);
    expect(suites.some((suite) => suite.layer === "feature")).toBe(true);
  });

  test("@config-contract smoke and feature tags are documented", () => {
    const tags = getSmokeAndFeatureTags();
    expect(tags).toContain("@calendar-smoke");
    expect(tags).toContain("@settings-feature");
  });
});

test.describe("@config-contract coverage matrix scaffolding", () => {
  test("@config-contract coverage matrix contains rows for every area and product", () => {
    const rows = buildCoverageMatrixRows();
    for (const area of areas) {
      for (const product of getDocumentedProductNames()) {
        expect(rows.some((row) => row.area === area && row.product === product)).toBe(
          true
        );
      }
    }
  });

  test("@config-contract smoke and feature suite definitions are both documented", () => {
    expect(getCoverageSuitesForLayer("smoke").length).toBeGreaterThan(0);
    expect(getCoverageSuitesForLayer("feature").length).toBeGreaterThan(0);
  });
});
