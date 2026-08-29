import { expect, type Locator } from "@playwright/test";

/**
 * Configures a visible-locator assertion.
 */
export interface VisibleLocatorExpectationOptions {
  message?: string;
  timeout?: number;
}

/**
 * Returns a locator that resolves to the first currently visible candidate.
 */
export function getAnyVisibleLocator(locators: readonly Locator[]): Locator {
  const [first, ...rest] = locators;
  if (!first) {
    throw new Error("At least one locator is required.");
  }
  return rest
    .reduce((combined, locator) => combined.or(locator), first)
    .filter({ visible: true })
    .first();
}

/**
 * Asserts that at least one candidate is visible and returns its union locator.
 */
export async function expectAnyLocatorVisible(
  locators: readonly Locator[],
  options: VisibleLocatorExpectationOptions = {}
): Promise<Locator> {
  const locator = getAnyVisibleLocator(locators);
  const assertion = options.message
    ? expect(locator, options.message)
    : expect(locator);
  await assertion.toBeVisible({ timeout: options.timeout });
  return locator;
}
