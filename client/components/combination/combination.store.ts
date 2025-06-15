import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  ActiveResourceStore,
  ResourceStore,
  activeResources
} from "$lib/client/components/flux/resourceStores/resource.store";
import type {
  IRecordId,
  IResourceSelectAdditionalParams,
  IResourceSelectParams
} from "$lib/client/types/data.type";
import type { IActiveCombination, ICombination } from "./combination.type";
import {
  ResourceAccessMode,
  ResourceAccessPoint
} from "$lib/client/components/flux/resourceStores/resource.type";
import {
  type IContextMenu,
  type IContextMenuItem
} from "$lib/client/types/select.type";
import { ResourceActions } from "$lib/client/components/record/resource.actions";
import context from "$lib/client/stores/context.store";
import { get } from "svelte/store";
import { Embed } from "$lib/client/types/context.type";

class CombinationStore extends ResourceStore<ICombination> {
  constructor() {
    super(Resource.combination);
  }
  selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    const expandedProps = ["*"];
    const properties = [
      ...(additionalParams?.isExpand ? expandedProps : []),
      ...(params?.properties ?? [])
    ];
    if (additionalParams?.isQueryAsIs) {
      return super.selectMany(
        {
          ...(params ?? {}),
          properties
        },
        additionalParams
      );
    }
    const filters = {
      ...(params?.filters ?? {}),
      type:
        params?.filters && "type" in params.filters && params?.filters?.type
          ? typeof params.filters.type === "string"
            ? params.filters.type.toUpperCase()
            : params.filters.type
          : undefined
    };
    params = {
      ...(params ?? {}),
      properties,
      filters
    };
    return super.selectMany(params, additionalParams);
  }
}

export const combinationStore = new CombinationStore();

export class ActiveCombinationStore extends ActiveResourceStore<any, any> {
  constructor(combinationId: IRecordId) {
    super(combinationId, combinationStore);
  }

  async init(accessMode: ResourceAccessMode) {
    try {
      this.update((val: any) => {
        if (val) val.isPageLoading = true;
        else val = { isPageLoading: true };
        val.accessMode = accessMode;
        return val;
      });

      const result = await this.resourceStore.select(this.id);
      if (!result) return;

      this.set({
        ...result,
        accessMode,
        isPageLoading: false
      });
    } catch (e) {
      console.error("error in init combination store", {
        id: this.id,
        error: e
      });
    }
  }
}

export function resolveCombinationContextMenu(
  combination: ICombination,
  accessPoint: ResourceAccessPoint
): IContextMenu {
  const resourceActions = new ResourceActions(
    combination,
    combinationStore,
    accessPoint
  );
  const ctx = get(context);

  let commonGroups: { group: string; items: IContextMenuItem[] }[] = [];
  if (ctx.isEmbed && ctx.embed === Embed.HANDSET) {
    commonGroups = [
      {
        group: "more",
        items: [resourceActions.archive(), resourceActions.trash()]
      }
    ];
  } else {
    commonGroups = [
      {
        group: "open",
        items: [resourceActions.openAsTab(), resourceActions.openAsFull()]
      },
      {
        group: "more",
        items: [resourceActions.archive(), resourceActions.trash()]
      }
    ];
  }

  if (accessPoint != ResourceAccessPoint.SELF) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.select(accessPoint),
          resourceActions.edit(accessPoint),
          resourceActions.copyLink()
        ]
      },
      ...commonGroups
    ];
  }

  return [
    {
      group: "primary",
      items: [
        resourceActions.star(),
        resourceActions.edit(accessPoint),
        resourceActions.copyLink()
      ]
    },
    ...commonGroups
  ];
}
