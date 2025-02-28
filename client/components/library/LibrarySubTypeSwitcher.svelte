<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { resolveGoalSubTypesForSwitcher } from "../goals/goal.utils";
  import { resolveTaskSubTypesForSwitcher } from "../tasks/task.utils";
  import { resolveNodeSubTypesForSwitcher } from "$lib/client/products/memotron/node/node.utils";
  import { resolveCollectionSubTypesForSwitcher } from "$lib/client/components/collection/collection.utils";
  import type { NodeType } from "$lib/client/products/memotron/node/node.type";
  import type { CollectionType } from "../collection/collection.type";
  import view from "$lib/client/stores/view.store";
  import { SearchStore } from "../record/record.store";
  import { logger } from "../debug/logger.client";
  import { Orientation } from "$lib/client/types/direction.enum";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import type { SubType } from "./library.type";
  import { onMount } from "svelte";
  import { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  export let resource: Resource;
  export let isConstrainedWidth: boolean = $view.isConstrainedWidth;
  export let accessPoint: ResourceAccessPoint;

  const nodeSubTypesForSwitcher = resolveNodeSubTypesForSwitcher();
  const collectionSubTypesForSwitcher = resolveCollectionSubTypesForSwitcher();
  const goalSubTypesForSwitcher = resolveGoalSubTypesForSwitcher(true);
  const taskSubTypesForSwitcher = resolveTaskSubTypesForSwitcher();
  const allSubTypeSwitcherItem = {
    label: "All",
    value: "all",
    icon: "ph:asterisk-light"
  };
  const starredSubTypeSwitcherItem = {
    label: "Starred",
    value: "starred",
    icon: "ph:star-light"
  };
  let subTypeCounts: { count: number; type: NodeType | CollectionType }[] = [];
  let isExpandableSubTypes: boolean = false;
  let isExpandSubTypes: boolean = false;
  let isStarFilterSelected: boolean = false;
  let isArchivedFilterSelected: boolean = false;
  let allSubTypes: ISelectItem[] = [];
  let renderedSubTypes: ISelectItem[] = [allSubTypeSwitcherItem];
  let searchStore = new SearchStore();

  let selectedSubType: SubType = "all";

  $: isExpandableSubTypes = [Resource.node].includes(resource);
  $: isNonStarrable = [Resource.task].includes(resource);
  $: isNonArchivable = [Resource.task].includes(resource);

  export function refresh() {
    refreshSubTypeSwitcher();
  }

  onMount(() => {
    refreshSubTypeSwitcher();
  });

  function resolveBaseFilters() {
    return {
      isStarred:
        isStarFilterSelected || selectedSubType === "starred"
          ? true
          : undefined,
      isArchived: isArchivedFilterSelected ? true : undefined
    };
  }

  async function refreshSubTypeSwitcher() {
    try {
      const filters = resolveBaseFilters();
      allSubTypes = resolveSubItems(resource);
      if (isConstrainedWidth) {
        renderedSubTypes = [...allSubTypes];
        return;
      }
      if (isExpandableSubTypes) {
        subTypeCounts = await searchStore.resolveSubTypeCounts(
          resource,
          filters
        );
        if (isValidArrayWithData(subTypeCounts)) {
          allSubTypes = allSubTypes.map((x) => {
            let count = subTypeCounts.find(
              (y: { type: any; count: number }) =>
                y.type?.toLowerCase() === x.value?.toLowerCase()
            )?.count;
            return {
              ...x,
              badge: count ? count : undefined
            };
          });
        }
      }
      if (!isExpandableSubTypes || isExpandSubTypes) {
        renderedSubTypes = [...allSubTypes];
        return;
      }
      renderedSubTypes = [...allSubTypes]
        .filter((x) => x.value === "all" || (x.badge && x.badge > 0))
        ?.sort((a, b) => (b.badge ?? 0) - (a.badge ?? 0));
      renderedSubTypes.pop();
      renderedSubTypes.unshift(allSubTypeSwitcherItem);
    } catch (e) {
      logger.error({ at: "Library - refreshSubTypeCountsAndSort", e });
    }

    function resolveSubItems(resource: Resource) {
      const items: ISelectItem[] = [allSubTypeSwitcherItem];
      if (isConstrainedWidth) {
        items.push(starredSubTypeSwitcherItem);
      }
      if (isConstrainedWidth && isExpandableSubTypes) return items;
      if (resource === Resource.node) {
        items.push(...nodeSubTypesForSwitcher);
      } else if (resource === Resource.collection) {
        items.push(...collectionSubTypesForSwitcher);
      } else if (resource === Resource.goal) {
        items.push(...goalSubTypesForSwitcher);
      } else if (resource === Resource.task) {
        items.push(...taskSubTypesForSwitcher);
      }
      return items;
    }
  }
</script>

{#if isConstrainedWidth}
  <OptionSelector
    size={Size.sm}
    options={renderedSubTypes}
    selected={selectedSubType}
    isPreventWrap={true}
    on:select={(e) => {
      if (!e?.detail) return;
      appStore.toggleSearchParam({
        type: e.detail.toLowerCase()
      });
    }}
  />
{:else}
  <div
    class={cn("flex gap-2 min-h-fit w-full", {
      "px-4": accessPoint === ResourceAccessPoint.LIBRARY
    })}
  >
    <div class="flex-1 min-w-0">
      <OptionSelector
        style={OptionSelectorStyle.OUTLINE}
        size={Size.sm}
        options={renderedSubTypes}
        selected={selectedSubType}
        isPreventWrap={isExpandableSubTypes && !isExpandSubTypes}
        on:select={(e) => {
          if (!e?.detail) return;
          appStore.toggleSearchParam({
            type: e.detail.toLowerCase()
          });
        }}
      />
    </div>
    {#if !isExpandSubTypes}
      <Divider orientation={Orientation.Vertical} />
    {/if}
    <div class="flex gap-1">
      {#if !isExpandSubTypes}
        {#if !isNonStarrable}
          <Toggle
            bind:on={isStarFilterSelected}
            icon="ph:star-light"
            tooltip="Show starred items"
            bgSize={Size.sm}
            on:change={() => {
              if (isStarFilterSelected) {
                appStore.toggleSearchParam({
                  starred: isStarFilterSelected
                });
              } else {
                appStore.toggleSearchParam(["starred"]);
              }
            }}
          />
        {/if}
        {#if !isNonArchivable}
          <Toggle
            bind:on={isArchivedFilterSelected}
            icon="ph:archive-light"
            tooltip="Show archived items"
            on:change={() => {
              if (isArchivedFilterSelected) {
                appStore.toggleSearchParam({
                  archived: isArchivedFilterSelected
                });
              } else {
                appStore.toggleSearchParam(["archived"]);
              }
            }}
            bgSize={Size.sm}
          />
        {/if}
      {/if}
      <slot />
      {#if isExpandableSubTypes}
        <Toggle
          bind:on={isExpandSubTypes}
          icon={isExpandSubTypes
            ? "ph:caret-left-light"
            : "ph:caret-down-light"}
          tooltip="Show all sub types"
          bgSize={Size.sm}
          on:change={() => refreshSubTypeSwitcher()}
        />
      {/if}
    </div>
  </div>
{/if}
