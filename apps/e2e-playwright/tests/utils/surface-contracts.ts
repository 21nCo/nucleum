import { expect, type Locator, type Page } from "@playwright/test";
import {
  getE2EProductConfigFromProjectName,
  type ProductName,
  type SurfaceContract,
  type SurfaceKey
} from "../../config/product-nav.config";
import { E2EContractError } from "./capabilities";

function getAnchorLocators(page: Page, contract: SurfaceContract): Locator[] {
  const byTestIds = contract.anchorTestIds.map((testId) => page.getByTestId(testId));
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
  projectName: ProductName,
  surface: SurfaceKey
): SurfaceContract {
  const contract = getE2EProductConfigFromProjectName(projectName).surfaces[surface];
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
  projectName: ProductName,
  surface: SurfaceKey
): Promise<void> {
  const contract = getSurfaceContract(projectName, surface);
  const anchors = getAnchorLocators(page, contract);
  const visible = await expect
    .poll(
      async () => {
        for (const anchor of anchors) {
          if (await anchor.isVisible().catch(() => false)) return true;
        }
        return false;
      },
      {
        timeout: 15_000
      }
    )
    .toBe(true)
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    throw new E2EContractError(
      "E2E_SURFACE_001",
      `Surface "${surface}" is declared available for project "${projectName}" but no anchor was visible.`
    );
  }
}

export async function navigateToSurface(
  page: Page,
  projectName: ProductName,
  surface: SurfaceKey
): Promise<void> {
  const contract = getSurfaceContract(projectName, surface);
  if (contract.route) {
    await page.goto(contract.route, { waitUntil: "domcontentloaded" });
    const routeVisible = await getSurfaceVisibility(page, contract);
    if (routeVisible) {
      return;
    }
  }
  if (contract.triggerTestId) {
    await page.getByTestId(contract.triggerTestId).click({ timeout: 10_000 });
  } else if (contract.triggerText) {
    const textLocator =
      typeof contract.triggerText === "string"
        ? page.getByText(contract.triggerText, { exact: true }).first()
        : page.getByText(contract.triggerText).first();
    const buttonLike = textLocator.locator("xpath=ancestor-or-self::button[1]").first();
    if (await buttonLike.count()) {
      await buttonLike.click({ timeout: 10_000 });
    } else {
      await textLocator.click({ timeout: 10_000 });
    }
  } else if (contract.triggerRole) {
    const trigger = contract.triggerName
      ? page.getByRole(contract.triggerRole, { name: contract.triggerName }).first()
      : page.getByRole(contract.triggerRole).first();
    await trigger.click({ timeout: 10_000 });
  } else if (!contract.route) {
    throw new E2EContractError(
      "E2E_SEL_001",
      `Surface "${surface}" for project "${projectName}" has neither route nor trigger contract.`
    );
  }
  await expectSurfaceVisible(page, projectName, surface);
}

async function getSurfaceVisibility(
  page: Page,
  contract: SurfaceContract
): Promise<boolean> {
  const anchors = getAnchorLocators(page, contract);
  for (const anchor of anchors) {
    if (await anchor.isVisible().catch(() => false)) {
      return true;
    }
  }
  return false;
}
