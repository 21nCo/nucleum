<script lang="ts">
  import type { Snippet } from "svelte";
  import { appStore } from "@21n/stores/app.store";
  import {
    OptionSelectorStyle,
    type ISelectItem
  } from "@21n/types/select.type";
  import { Size } from "@21n/types/size.enum";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { resolveGoalSubTypesForSwitcher } from "@21n/components/goals/goal.utils";
  import { resolveTaskSubTypesForSwitcher } from "@21n/components/tasks/task.utils";
  import { resolveNodeSubTypesForSwitcher } from "@21n/products/memotron/node/node.utils";
  import { resolveCollectionSubTypesForSwitcher } from "@21n/components/collection/collection.utils";
  import type { NodeType } from "@21n/products/memotron/node/node.type";
  import type { CollectionType } from "@21n/components/collection/collection.type";
  import view from "@21n/stores/view.store";
  import { SearchStore } from "@21n/components/record/record.store";
  import { logger } from "@21n/components/debug/logger.client";
  import { Orientation } from "@21n/types/direction.enum";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import type { SubType } from "@21n/components/library/library.type";
  import { onMount } from "svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { page } from "$app/stores";
  import { resourceCacheKey } from "@21n/components/flux/resourceStores/resource.utils";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { fade } from "svelte/transition";
  let {
    resource,
    isConstrainedWidth = $view.isConstrainedWidth,
    accessPoint,
    subContext = undefined,
    selectedSubType = "all",
    children = undefined
  }: {
    resource: Resource;
    isConstrainedWidth?: boolean;
    accessPoint: ResourceAccessPoint;
    subContext?: string | undefined;
    selectedSubType?: SubType;
    children?: Snippet | undefined;
  } = $props();

  const nodeSubTypesForSwitcher = resolveNodeSubTypesForSwitcher();
  const collectionSubTypesForSwitcher = resolveCollectionSubTypesForSwitcher();
  const goalSubTypesForSwitcher = resolveGoalSubTypesForSwitcher(true);
  const taskSubTypesForSwitcher = resolveTaskSubTypesForSwitcher();
  const allSubTypeSwitcherItem = {
    label: "All",
    value: "all",
    icon: "asterisk"
  };
  const starredSubTypeSwitcherItem = {
    label: "Starred",
    value: "starred",
    icon: "star"
  };
  let subTypeCounts = $state(new Map<NodeType | CollectionType, number>());
  let isExpandSubTypes = $state(false);
  let isStarFilterSelected = $state(
    $page.url.searchParams.get(
    AppSearchParam.STARRED
  )
    ? true
    : false
  );
  let isArchivedFilterSelected = $state(
    $page.url.searchParams.get(
    AppSearchParam.ARCHIVED
  )
    ? true
    : false
  );
  let allSubTypes = $state<ISelectItem[]>([]);
  let renderedSubTypes = $state<ISelectItem[]>([]);
  const searchStore = new SearchStore();

  let isExpandableSubTypes = $derived([Resource.node].includes(resource));
  let isNonStarrable = $derived([Resource.task].includes(resource));
  let isNonArchivable = $derived([Resource.task].includes(resource));

  export function refresh() {
    refreshSubTypeSwitcher();
  }

  onMount(() => {
    const unsubscribe = page.subscribe((p) => {
      if (p.url.searchParams.get(AppSearchParam.STARRED)) {
        isStarFilterSelected = true;
      } else {
        isStarFilterSelected = false;
      }
      if (p.url.searchParams.get(AppSearchParam.ARCHIVED)) {
        isArchivedFilterSelected = true;
      } else {
        isArchivedFilterSelected = false;
      }
      refreshSubTypeSwitcher();
    });
    refreshSubTypeSwitcher();
    return () => unsubscribe();
  });

  function resolveBaseFilters() {
    if (
      !(
        isStarFilterSelected ||
        selectedSubType === "starred" ||
        isArchivedFilterSelected
      )
    ) {
      return;
    }
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
      allSubTypes = resolveSubItems(resource);
      if (isConstrainedWidth) {
        renderedSubTypes = [...allSubTypes];
        return;
      }
      if (isExpandableSubTypes) {
        const filters = resolveBaseFilters();
        if (!filters) {
          subTypeCounts = cache.retrieve(
            resourceCacheKey(resource, CacheKey.SUB_TYPE_COUNTS)
          );
        } else {
          subTypeCounts = await searchStore.resolveSubTypeCounts(
            resource,
            filters
          );
        }
        if (subTypeCounts) {
          allSubTypes = allSubTypes.map((x) => {
            let count = subTypeCounts.get(
              x.value.toString().toUpperCase() as NodeType | CollectionType
            );
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
        .filter(
          (x) =>
            x.value === "all" ||
            (x.badge && typeof x.badge === "number" && x.badge > 0)
        )
        ?.sort((a, b) => +(b.badge ?? 0) - +(a.badge ?? 0));
      renderedSubTypes.pop();
      renderedSubTypes.unshift(allSubTypeSwitcherItem);
    } catch (e) {
      logger.error({ at: "Library - refreshSubTypeCountsAndSort", e });
    }

    function resolveSubItems(resource: Resource) {
      const items: ISelectItem[] = [allSubTypeSwitcherItem];
      // if (isConstrainedWidth) {
      //   items.push(starredSubTypeSwitcherItem);
      // }
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

  function onSelect(val: SubType) {
    if (subContext) {
      appStore.toggleSearchParam({
        [`${subContext}-${AppSearchParam.TYPE}`]: val.toLowerCase()
      });
    } else {
      appStore.toggleSearchParam({
        [AppSearchParam.TYPE]: val.toLowerCase()
      });
    }
  }
</script>

{#if isConstrainedWidth}
  <div class="flex gap-2 items-center justify-between">
    <div class="flex-1 min-w-0">
      <OptionSelector
        size={Size.sm}
        options={renderedSubTypes}
        selected={selectedSubType}
        isPreventWrap={true}
        onSelect={(e) => {
          if (!e?.detail) return;
          onSelect(e.detail);
        }}
      />
    </div>
    {@render children?.()}
  </div>
{:else}
  <div
    class={cn("flex gap-2 min-h-fit w-full", {
      "px-4": accessPoint === ResourceAccessPoint.LIBRARY
    })}
    in:fade={{ duration: 200 }}
  >
    <div class="flex-1 min-w-0">
      {#if resource === Resource.task}
        {#if renderedSubTypes.length > 0}
          <PanelSwitcher
            items={renderedSubTypes.map((x) => ({
              label: x.label,
              value: x.value
            }))}
            value={selectedSubType}
            size={Size.sm}
            style={PanelSwitcherStyle.BAR}
            barStyle={BarStyle.DOT}
            onSwitch={(e) => {
              if (!e?.detail) return;
              onSelect(e.detail);
            }}
          />
        {/if}
      {:else}
        <div class="flex gap-2 items-center h-full">
          {#if !isNonStarrable}
            <Toggle
              bind:on={isStarFilterSelected}
              icon="star"
              tooltip="Show starred items"
              bgSize={Size.sm}
              onChange={() => {
                if (isStarFilterSelected) {
                  appStore.toggleSearchParam({
                    [AppSearchParam.STARRED]: isStarFilterSelected
                  });
                } else {
                  appStore.toggleSearchParam([AppSearchParam.STARRED]);
                }
              }}
            />
            <Divider orientation={Orientation.Vertical} />
          {/if}
          <div class="flex-1 min-w-0">
            <OptionSelector
              style={OptionSelectorStyle.OUTLINE}
              size={Size.sm}
              options={renderedSubTypes}
              selected={selectedSubType}
              isPreventWrap={isExpandableSubTypes && !isExpandSubTypes}
              onSelect={(e) => {
                if (!e?.detail) return;
                onSelect(e.detail);
              }}
            />
          </div>
        </div>
      {/if}
    </div>
    {#if !isExpandSubTypes && resource === Resource.node}
      <Divider orientation={Orientation.Vertical} />
    {/if}
    <div class="flex items-center gap-1">
      {#if !isExpandSubTypes}
        {#if !isNonArchivable}
          <Toggle
            bind:on={isArchivedFilterSelected}
            icon="archive"
            tooltip="Show archived items"
            onChange={() => {
              if (isArchivedFilterSelected) {
                appStore.toggleSearchParam({
                  [AppSearchParam.ARCHIVED]: isArchivedFilterSelected
                });
              } else {
                appStore.toggleSearchParam([AppSearchParam.ARCHIVED]);
              }
            }}
            bgSize={Size.sm}
          />
        {/if}
      {/if}
      {@render children?.()}
      {#if isExpandableSubTypes}
        <Toggle
          bind:on={isExpandSubTypes}
          icon={isExpandSubTypes ? "chevron-left" : "chevron-down"}
          tooltip="Show all sub types"
          bgSize={Size.sm}
          onChange={() => refreshSubTypeSwitcher()}
        />
      {/if}
    </div>
  </div>
{/if}

{#if isExpandableSubTypes}
  <ComponentBaseLayer
    subscribeToCacheUpdate={[
      resourceCacheKey(resource, CacheKey.SUB_TYPE_COUNTS)
    ]}
    onChange={refreshSubTypeSwitcher}
  />
{/if}
