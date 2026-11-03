import { get } from "svelte/store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import type { ISpacePageNavItem } from "@nucleum/features/spaces/space.type";
import {
  normalizeSpacePagePath,
  resolveSpacePageRoute
} from "@nucleum/features/spaces/space.utils";

/**
 * Page a page link opens in the current product, or undefined when the product has
 * no such page or hides it in the current context.
 */
export function resolveOpenableSpacePage(path: string) {
  const route = resolveSpacePageRoute(get(appStore).actions ?? [], path);
  if (!route) return undefined;
  const page = route.action.subViewOf ?? route.action.action;
  return requireCommandHost().resolveAction(page) ? route : undefined;
}

/**
 * Navigates to the page a page link points to. Shell navigation is loaded on first
 * use so rendering a space item does not load the shell's tab and UI state stores.
 */
export async function openSpacePage(item: ISpacePageNavItem) {
  const { navigation } = await import("@nucleum/shell/navigation/navigation");
  await navigation.gotoPath(`/${normalizeSpacePagePath(item.path)}`);
}
