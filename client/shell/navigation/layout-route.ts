import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

import { AccessMode } from "@nucleum/datafn/resource.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

/** Decodes shell regions and resource overlays from the current route. */
export function resolveLayoutRoute(url?: URL) {
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const rightPanelParam = searchParams.get(AccessMode.RIGHT);
  const popParam = searchParams.get(AccessMode.POP);
  const popAction = popParam
    ? requireCommandHost().resolveAction(popParam.split(":")[0])
    : undefined;
  return {
    isMaxMode: searchParams.get(AppSearchParam.MAX) === "true",
    isHomePage: url ? isHomeRoute(url) : false,
    rightPanel: rightPanelParam
      ? (requireCommandHost().resolveAction(rightPanelParam) ?? undefined)
      : undefined,
    pop:
      popParam && popAction
        ? { id: popParam as IRecordId, action: popAction }
        : undefined,
    mainPath: searchParams.get(AccessMode.MAIN) ?? undefined
  };
}
/** Identifies the shell home route independently of product page components. */
export function isHomeRoute(url: URL) {
  return url.pathname.split("/").filter(Boolean).at(-1) === "home";
}
