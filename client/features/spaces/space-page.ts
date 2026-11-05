import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import type { ISpacePageNavItem } from "@nucleum/features/spaces/space.type";
import {
  normalizeSpacePagePath,
  resolveSpacePageRoute
} from "@nucleum/features/spaces/space.utils";

/**
 * Page a page link opens among the current product's actions, or undefined when the
 * product has no such page or hides it in the current context. Callers pass the
 * actions from a reactive source so the result follows changes to them.
 */
export function resolveOpenableSpacePage(
  actions: IAction[] | undefined,
  path: string
) {
  const route = resolveSpacePageRoute(actions ?? [], path);
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
