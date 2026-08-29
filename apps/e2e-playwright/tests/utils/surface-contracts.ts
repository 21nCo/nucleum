import { expect, type Locator, type Page } from "@playwright/test";
import {
  resolveSurfaceContract,
  type E2EProduct,
  type SurfaceContract,
  type SurfaceKey
} from "../../config/e2e.config";
import { E2EContractError } from "./contract-error";
import { expectAnyLocatorVisible } from "./locator-assertions";

function getAnchorLocators(page: Page, contract: SurfaceContract): Locator[] {
  const byTestIds = contract.anchorTestIds.map((testId) =>
    page.getByTestId(testId)
  );
  const byRoles =
    contract.anchorRoles?.map((anchor) =>
      anchor.name
        ? page.getByRole(anchor.role, { name: anchor.name }).first()
        : page.getByRole(anchor.role).first()
    ) ?? [];
  const byTexts =
    contract.anchorTexts?.map((anchor) =>
      typeof anchor === "string"
        ? page.getByText(anchor, { exact: true }).first()
        : page.getByText(anchor).first()
    ) ?? [];
  return [...byTestIds, ...byRoles, ...byTexts];
}

export function getSurfaceContract(
  projectName: E2EProduct,
  surface: SurfaceKey
): SurfaceContract {
  const contract = resolveSurfaceContract(projectName, surface);
  if (!contract) {
    throw new E2EContractError(
      "E2E_SEL_001",
      `Surface contract "${surface}" is not defined for project "${projectName}".`
    );
  }
  const hasAnchors =
    contract.anchorTestIds.length > 0 ||
    (contract.anchorRoles?.length ?? 0) > 0 ||
    (contract.anchorTexts?.length ?? 0) > 0;
  if (!hasAnchors) {
    throw new E2EContractError(
      "E2E_SEL_001",
      `Surface contract "${surface}" has no semantic anchors for project "${projectName}".`
    );
  }
  return contract;
}

export async function expectSurfaceVisible(
  page: Page,
  projectName: E2EProduct,
  surface: SurfaceKey
): Promise<void> {
  const contract = getSurfaceContract(projectName, surface);
  try {
    if (contract.route) {
      const expectedPath =
        new URL(contract.route, page.url()).pathname.replace(/\/+$/, "") || "/";
      await page.waitForURL(
        (url) => (url.pathname.replace(/\/+$/, "") || "/") === expectedPath,
        { timeout: 15_000 }
      );
    }
    await expectAnyLocatorVisible(getAnchorLocators(page, contract), {
      message: `${projectName} ${surface} surface exposes a visible anchor`,
      timeout: 15_000
    });
  } catch {
    throw new E2EContractError(
      "E2E_SURFACE_001",
      `Surface "${surface}" is declared available for project "${projectName}" but no anchor was visible.`
    );
  }
}

export async function navigateToSurface(
  page: Page,
  projectName: E2EProduct,
  surface: SurfaceKey
): Promise<void> {
  const contract = getSurfaceContract(projectName, surface);
  if (await getSurfaceVisibility(page, contract)) return;

  if (contract.route) {
    await page.goto(contract.route, { waitUntil: "domcontentloaded" });
    const routeVisible = await getSurfaceVisibility(page, contract);
    if (routeVisible) {
      return;
    }
  }
  const trigger = await getTriggerLocator(page, contract);
  if (trigger) {
    await trigger.click({ timeout: 10_000 });
  } else if (!contract.route) {
    throw new E2EContractError(
      "E2E_SEL_001",
      `Surface "${surface}" for project "${projectName}" has neither route nor trigger contract.`
    );
  }
  await expectSurfaceVisible(page, projectName, surface);
}

async function getTriggerLocator(
  page: Page,
  contract: SurfaceContract
): Promise<Locator | null> {
  let trigger: Locator | null = null;
  if (contract.triggerTestId) {
    trigger = page.getByTestId(contract.triggerTestId);
  } else if (contract.triggerText) {
    const textLocator =
      typeof contract.triggerText === "string"
        ? page.getByText(contract.triggerText, { exact: true }).first()
        : page.getByText(contract.triggerText).first();
    const buttonLike = textLocator
      .locator("xpath=ancestor-or-self::button[1]")
      .first();
    trigger = (await buttonLike.count()) ? buttonLike : textLocator;
  } else if (contract.triggerRole) {
    trigger = contract.triggerName
      ? page
          .getByRole(contract.triggerRole, { name: contract.triggerName })
          .first()
      : page.getByRole(contract.triggerRole).first();
  }
  if (!trigger) return null;
  return trigger;
}

async function getSurfaceVisibility(
  page: Page,
  contract: SurfaceContract
): Promise<boolean> {
  if (contract.route) {
    const currentPath = new URL(page.url()).pathname.replace(/\/+$/, "") || "/";
    const expectedPath =
      new URL(contract.route, page.url()).pathname.replace(/\/+$/, "") || "/";
    if (currentPath !== expectedPath) return false;
  }
  const anchors = getAnchorLocators(page, contract);
  for (const anchor of anchors) {
    if (await anchor.isVisible().catch(() => false)) {
      return true;
    }
  }
  return false;
}
