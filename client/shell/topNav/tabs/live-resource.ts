import { readable, type Readable } from "svelte/store";
import { toSvelteStore } from "@datafn/svelte";
import { datafn } from "@nucleum/datafn/datafn.store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { resolveResource } from "@nucleum/datafn/resource-query.utils";
import {
  determineResourceType,
  isRecordId
} from "@nucleum/datafn/resource.utils";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { logger } from "@nucleum/client/runtime/logging/logger";

/** A record or page action shown by its label, kept up to date. */
export type LiveResource = {
  resource: any;
  action: IAction | null | undefined;
  resourceType: Resource;
  isResolved: boolean;
};

/**
 * Follows the label source of a record id or a page action slug: the record,
 * kept live through its DataFn signal, or the action label and icon.
 */
export function liveResource(item: IRecordId | string): Readable<LiveResource> {
  const initial: LiveResource = {
    resource: undefined,
    action: undefined,
    resourceType: Resource.unknown,
    isResolved: false
  };
  return readable(initial, (set) => {
    let state = initial;
    let isActive = true;
    const update = (patch: Partial<LiveResource>) => {
      state = { ...state, ...patch };
      set(state);
    };
    if (!isRecordId(item)) {
      const action = requireCommandHost().resolveAction(item.toString());
      update({
        action,
        resource: action
          ? { label: action.label, icon: action.icon }
          : undefined,
        isResolved: true
      });
      return;
    }
    const resourceType = determineResourceType(item) as Resource;
    update({
      resourceType,
      action: requireCommandHost().resolveAction(resourceType)
    });
    const unsubscribe =
      resourceType === Resource.unknown
        ? undefined
        : toSvelteStore<unknown[]>(
            datafn.table(resourceType).signal({
              filters: { id: item },
              limit: 1,
              metadata: { includeTrashed: true, includeArchived: true }
            }),
            { initialData: [] }
          ).subscribe((value) => {
            const record = value.data?.[0];
            if (record && typeof record === "object") {
              update({
                resource: { ...state.resource, ...record },
                isResolved: true
              });
            }
          });
    resolveResource(item)
      .catch((error) => {
        logger.error({ at: "liveResource", item, error });
        return undefined;
      })
      .then((resolved) => {
        if (!isActive) return;
        update({
          resource: resolved
            ? { ...resolved, ...(state.resource ?? {}) }
            : state.resource,
          isResolved: true
        });
      });
    return () => {
      isActive = false;
      unsubscribe?.();
    };
  });
}
