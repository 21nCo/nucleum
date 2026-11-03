import { get } from "svelte/store";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { navigation } from "@nucleum/shell/navigation/navigation";
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

/** Navigates to the page a page link points to. */
export function openSpacePage(item: ISpacePageNavItem) {
  navigation.gotoPath(`/${normalizeSpacePagePath(item.path)}`);
}
