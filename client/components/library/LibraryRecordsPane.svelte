<script lang="ts">
  import Records from "$lib/client/components/record/Records.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint,
    ResourceAccessPointState,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import BulkEditBar from "$lib/client/components/record/BulkEditBar.svelte";
  import {
    BulkEditor,
    SearchStore
  } from "$lib/client/components/record/record.store";

  import LibrarySearchBox from "$lib/client/components/library/LibrarySearchBox.svelte";
  import {
    CollectionType,
    type ICollection
  } from "$lib/client/components/collection/collection.type";
  import {
    NodeType,
    rootNodeTypeList,
    type INode
  } from "$lib/client/products/memotron/node/node.type";

  import { debouncer } from "$lib/client/utils/utils";
  import {
    PersistenceActionType,
    type IMutationParamsv2,
    type IResourceSelectOrderBy
  } from "$lib/client/types/data.type";
  import LibraryLoadingPulse from "$lib/client/components/library/LibraryLoadingPulse.svelte";
  import view from "$lib/client/stores/view.store";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { intersection } from "$lib/client/actions/intersection.action";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import InlineSyncingFeedback from "$lib/client/elements/feedback/InlineSyncingFeedback.svelte";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { resolveMultiSelectStore } from "../flux/resourceStores/resource.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import { onDestroy, onMount, tick } from "svelte";
  import { page } from "$app/stores";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { fade, fly } from "svelte/transition";
  import {
    availableResources,
    isSameResource,
    removeDuplicatesFilter,
    resourceAction
  } from "../flux/resourceStores/resource.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { createEventDispatcher } from "svelte";
  import { collectionCountStore } from "../collection/collectionCount.store";

  import TaskLibrary from "../tasks/TaskLibrary.svelte";
  import LibrarySubTypeSwitcher from "./LibrarySubTypeSwitcher.svelte";
  import type { SubType } from "./library.type";
  import { isCustomLibrary } from "./library.utils";
  import LinkTagsControlPanel from "$lib/client/products/memotron/linking/LinkTagsControlPanel.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  const dispatch = createEventDispatcher();

  export let resource: Resource;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.LIBRARY;
  export let accessPointState: ResourceAccessPointState =
    ResourceAccessPointState.DEFAULT;
  export let arrangement: Arrangement | null = null;
  export let isConstrainedWidth: boolean = $view.isConstrainedWidth;

  let searchQuery: string = "";
  let isStarFilterSelected: boolean = false;
  let isArchivedFilterSelected: boolean = false;
  let data: any[] = [];
  let searchStore = new SearchStore();
  let QAsearchStore = new SearchStore();
  // QAsearchStore.searchType = SearchType.SEMANTIC;
  let selectedSubType: SubType = "all";
  let isRefreshing: boolean = true;
  let totalCountAfterFilter: number = 0;
  let isRefreshingTotalCount: boolean = false;
  let availableResourcesSet: Set<Resource> = new Set(availableResources);
  let refreshResetTimeout: any;
  let isSearchExpanded = false;
  let searchInputRef: InlineSearchBar;
  let isRefineShown = false;
  let subTypeSwitcherRef: LibrarySubTypeSwitcher;

  $: multiSelectContext = {
    resource,
    accessPoint
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

  $: isCustom = isCustomLibrary(resource);

  let pageSub: any;
  onMount(async () => {
    if (isCustom) return;
    pageSub = page.subscribe(async (p) => {
      const subResourceParam = p.url.searchParams.get(AppSearchParam.TYPE);
      let isRefreshNeeded = false;
      if (subResourceParam && subResourceParam !== selectedSubType) {
        selectedSubType = (subResourceParam as SubType) ?? "all";
        isRefreshNeeded = true;
      }
      if (p.url.searchParams.get(AppSearchParam.STARRED)) {
        isStarFilterSelected = true;
        isRefreshNeeded = true;
      } else if (isStarFilterSelected) {
        isStarFilterSelected = false;
        isRefreshNeeded = true;
      }

      if (p.url.searchParams.get(AppSearchParam.ARCHIVED)) {
        isArchivedFilterSelected = true;
        isRefreshNeeded = true;
      } else if (isArchivedFilterSelected) {
        isArchivedFilterSelected = false;
        isRefreshNeeded = true;
      }
      if (isRefreshNeeded) await refresh();
    });
    if (resource === Resource.collection) {
      await collectionCountStore.initialize();
    }
    refresh();
  });

  onDestroy(() => {
    if (pageSub) pageSub();
  });

  function onSelectAll() {
    $multiSelectStore = data.map((x) => x.id);
  }

  async function onBulkAction(e: CustomEvent<string>) {
    try {
      const editor = new BulkEditor(resource, multiSelectStore);
      await editor.run(e.detail);
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }

  async function refreshFilteredRecordsCount() {
    const filters = resolveFilters();
    await _refreshFiltersRecordsCount(filters);
  }

  function refreshTotalRecordsCount() {
    dispatch("refreshTotalCount");
  }

  async function refresh(isPagination?: boolean) {
    if (isCustom) return;
    logger.log({
      at: "LibraryRecordsPane - refresh",
      isPagination,
      resource,
      selectedSubType
    });
    if (!availableResourcesSet.has(resource)) {
      data = [];
      return;
    }
    if (isPagination !== true) {
      isRefreshing = true;
      data = [];
    }
    try {
      let orderBy: IResourceSelectOrderBy | undefined;
      let semanticSearchTopK: number | undefined;
      // if (searchStore.searchType == SearchType.SEMANTIC) {
      //   orderBy = {
      //     dist: "desc",
      //     createdAt: "desc"
      //   };
      // }
      subTypeSwitcherRef?.refresh();
      const filters = resolveFilters();
      const newData = await searchStore.select({
        resource,
        searchQuery,
        filters,
        orderBy,
        semanticSearchTopK,
        limit: 50,
        offset: isPagination ? data.length : 0
      });
      if (isPagination)
        data = [...data, ...newData]?.filter(removeDuplicatesFilter);
      else data = [...newData];
      clearTimeout(refreshResetTimeout);
      refreshResetTimeout = setTimeout(() => {
        isRefreshing = false;
      }, 1);
      await _refreshFiltersRecordsCount(filters);
    } catch (e) {
      isRefreshing = false;
      logger.error({ at: "Library - refresh", e });
    }
  }

  function isGenericSubType() {
    return ["all", "starred", "recents"].includes(selectedSubType);
  }

  function resolveFilters() {
    let filters: any = resolveBaseFilters();
    if (!isGenericSubType()) {
      if (resource === Resource.node) {
        filters = { ...filters, contentType: selectedSubType };
      } else if (
        resource === Resource.collection ||
        resource === Resource.goal
      ) {
        filters = { ...filters, type: selectedSubType };
      } else if (resource === Resource.task) {
        if (selectedSubType === "incomplete") {
          filters = { ...filters, isChecked: false };
        }
      }
    }
    return filters;
  }

  function resolveBaseFilters() {
    return {
      isStarred:
        isStarFilterSelected || selectedSubType === "starred"
          ? true
          : undefined,
      isArchived: isArchivedFilterSelected ? true : undefined
    };
  }

  async function _refreshFiltersRecordsCount(filters: any) {
    try {
      isRefreshingTotalCount = true;
      totalCountAfterFilter = await searchStore.resolveCount(
        resource,
        !isGenericSubType()
          ? (selectedSubType.toUpperCase() as NodeType | CollectionType)
          : undefined,
        filters
      );
    } catch (e) {
      logger.error({ at: "Library - refreshTotalCounts", e });
    } finally {
      isRefreshingTotalCount = false;
    }
  }

  const debouncedSearch = debouncer(refresh, 500);

  function resolveFooterMessage(data: any[], totalCount: number) {
    if (!data || !data.length) return;
    let prefix = "Showing " + data.length + " ";
    const label = resolveResourceLabel();
    if (isStarFilterSelected) return `${prefix} ⭐️ staaarrrrrrrrrred ${label}`;
    else if (searchQuery)
      return `${prefix} ${label} containing "${searchQuery}"`;
    else return `Showing ${data.length} of ${totalCount ?? "Unknown"} ${label}`;
  }

  function resolveEmptyStateMessage() {
    const label = resolveResourceLabel(true);
    if (isStarFilterSelected)
      return {
        mainText: `No starred ${label} found.`,
        subText: `Please star some ${label} to see them here.`
      };
    else if (searchQuery)
      return {
        mainText: `No ${label} found.`,
        subText: `Please try a different search or create a new ${resource}.`
      };
    else {
      if (resource === Resource.node) {
        return {
          mainText: `Looks like you don't have any ${label} yet.`,
          subText: `Please create nodes using capture or install our chrome extension to clip from web.`
        };
      }
      return {
        mainText: `Looks like you don't have any ${label} yet.`,
        subText: `Please create one.`
      };
    }
  }

  function resolveResourceLabel(isPlural: boolean = false) {
    let label = "items";
    if (resource === Resource.everything) label = "item";
    else if (selectedSubType && selectedSubType !== "all") {
      label = ` ${enumToString(selectedSubType).toLowerCase()} ${resource}`;
    } else label = resource;
    return label + ((data && data.length > 1) || isPlural ? "s" : "");
  }

  /**
   *
   * For nodes, filters nodes if has isArchived or trashInformation i.e. deleted or archived irrespective of whether its a root node or md block node as md blocks are anyways not present in data. Currently does full refresh for unarchive or undelete which is optimal if the nodes are root nodes.
   *
   * TODO - undo delete for block nodes case in markdown node - to avoid flickering in the background when editing a markdown node in modal.
   * @param e
   */
  async function onResourceMutation(
    e: CustomEvent<{
      resource: Resource;
      params: IMutationParamsv2<INode | ICollection>;
    }>
  ) {
    const resource = e.detail.resource;
    const mutation = e.detail.params;
    logger.debug({
      at: "LibraryRecordsPane - onResourceMutation",
      resource,
      ...mutation
    });
    const recordsRemovedCases = ["isArchived", "trashInformation"];
    if (
      mutation.action === PersistenceActionType.MERGE &&
      recordsRemovedCases.some((x) => mutation.record[x])
    ) {
      const id = mutation.record.id;
      refreshTotalRecordsCount();
      await refreshFilteredRecordsCount();
      if (id) data = data.filter((x) => !isSameResource(x.id, id));
      return;
    }
    if (mutation.action === PersistenceActionType.MERGE) return;

    if (
      resource === Resource.node &&
      mutation.action === PersistenceActionType.INSERT &&
      (!rootNodeTypeList.includes(
        mutation.records[0].contentType as NodeType
      ) ||
        mutation.records[0].creationContext)
    ) {
      return;
    }
    await refresh();
  }

  function resolveArrangement(arrangement?: Arrangement | null) {
    if (arrangement) return arrangement;
    if ($view.isConstrainedWidth) {
      if (resource === Resource.node) return Arrangement.GRID;
      else return Arrangement.LIST;
    }
    if (resource === Resource.task) return Arrangement.LIST;
    return Arrangement.GRID;
  }
</script>

{#if isCustom}
  {#if resource === Resource.relation}
    <LinkTagsControlPanel {accessPoint} />
  {:else if resource === Resource.task}
    <TaskLibrary {accessPoint} />
  {/if}
{:else}
  {#if isConstrainedWidth}
    {#if isSearchExpanded}
      <InlineSearchBar
        bind:this={searchInputRef}
        bind:query={searchQuery}
        padding="px-4"
        on:search={() => refresh()}
        placeholder={"Search " + resource + "s"}
        style={InputStyle.FILLED}
      >
        <Button
          icon="ph:x-circle-light"
          tooltip="Close search"
          size={Size.lg}
          on:click={() => (isSearchExpanded = !isSearchExpanded)}
        />
      </InlineSearchBar>
    {:else}
      <div class="flex items-center w-full gap-2 px-2 h-12 min-h-12">
        <Button
          icon="ph:magnifying-glass-light"
          size={Size.lg}
          on:click={async () => {
            isSearchExpanded = !isSearchExpanded;
            await tick();
            searchInputRef?.focus();
          }}
        />
        <div class="flex-1 min-w-0" in:fade>
          <LibrarySubTypeSwitcher
            {resource}
            {isConstrainedWidth}
            {accessPoint}
            {selectedSubType}
            bind:this={subTypeSwitcherRef}
          />
        </div>
        <Toggle
          bind:on={isRefineShown}
          icon="ph:sliders-horizontal-light"
          tooltip="Settings & filters"
          size={Size.lg}
          bgSize={Size.sm}
        />
      </div>
      {#if isRefineShown}
        <div
          class="flex flex-col gap-4 mx-3 p-3 bg-bgs2 rounded-md"
          in:fly={{ y: -20, duration: 300 }}
        >
          <!-- <div class="flex gap-4 items-center">
            <Button
              icon="funnel"
              style={ButtonStyle.OUTLINED}
              size={Size.sm}
              label="Filters"
              isPreventMinWidth={true}
            />
            <Button
              icon="bars-center-left"
              style={ButtonStyle.OUTLINED}
              size={Size.sm}
              label="Sort"
              isPreventMinWidth={true}
            />
          </div> -->

          <DropDown
            label={{
              label: "Arrangement",
              orientation: Orientation.Horizontal
            }}
            items={[
              {
                label: "List",
                icon: "ph:list-light",
                value: Arrangement.LIST
              },
              {
                label: "Grid",
                icon: "ph:squares-four-light",
                value: Arrangement.GRID
              }
            ]}
            width="w-40"
            isDisableSearch={true}
            size={Size.sm}
            value={arrangement ?? undefined}
            on:select={(e) => {
              if (!e?.detail) return;
              const newArrangement = e.detail;
              uiState.setResourceState(
                resource,
                ResourceAccessPoint.BROWSER,
                UIState.arrangement,
                newArrangement
              );
              arrangement = newArrangement;
            }}
          />
          <SwitchInput
            bind:checked={isArchivedFilterSelected}
            isExpanded={true}
            label={{ label: "Show archived items only" }}
            on:change={() => refresh()}
          />
          <div class="flex gap-2 items-center w-full justify-center">
            <Badge text="soon" />
            <span class="text-b3 text-fgs3">
              Filters & sorting will be available soon
            </span>
          </div>
        </div>
      {/if}
    {/if}
  {:else}
    <LibrarySearchBox
      {selectedSubType}
      {searchStore}
      {resource}
      bind:searchQuery
      on:refresh={debouncedSearch}
      on:semanticSearch={(e) => {
        // if (e.detail) {
        //   searchStore.searchType = SearchType.SEMANTIC;
        // } else {
        //   searchStore.searchType = SearchType.FULL_TEXT;
        // }
        refresh();
      }}
    />
    <LibrarySubTypeSwitcher
      {resource}
      {isConstrainedWidth}
      {accessPoint}
      {selectedSubType}
      bind:this={subTypeSwitcherRef}
    />
  {/if}
  <div class="flex flex-col gap-4 px-4 overflow-auto grow">
    <InlineSyncingFeedback {resource} isFullWidthVariant={true} />
    {#if isRefreshing}
      <LibraryLoadingPulse {isConstrainedWidth} {arrangement} />
    {:else if data && data.length > 0}
      <div>
        <Records
          {data}
          {accessPoint}
          {accessPointState}
          {resource}
          defaultAccessMode={accessPoint === ResourceAccessPoint.LIBRARY ||
          $view.isConstrainedWidth
            ? ResourceAccessMode.POP
            : ResourceAccessMode.INLINE}
          size={$view.isConstrainedWidth ? Size.sm : Size.md}
          isShowLoadingPulseAtTheEnd={data.length < totalCountAfterFilter &&
            !searchQuery}
          arrangement={resolveArrangement(arrangement)}
        />
      </div>
      <div
        class="flex w-full justify-center text-b2 text-fgs3"
        use:intersection={{
          rootMargin: "100px",
          callback: () => {
            if (data.length > 0 && data.length < totalCountAfterFilter) {
              refresh(true);
            }
          }
        }}
      >
        {#if isRefreshingTotalCount}
          <Icon icon="svg-spinners:3-dots-fade" />
        {:else}
          {resolveFooterMessage(data, totalCountAfterFilter) ?? ""}
        {/if}
      </div>
      <ScrollViewBottomSpacer />
    {:else}
      <EmptyStatusView
        size={Size.lg}
        {...resolveEmptyStateMessage()}
        isSearchContext={true}
        actionText={resource === Resource.node &&
        $context.embed !== Embed.HANDSET
          ? "Install chrome extension"
          : "Create new " + resource}
        on:click={() => {
          if (resource === Resource.node) {
            appStore.openLink(
              $appStore.appData?.urls?.chromeExtension ?? "https://memotron.io"
            );
          } else {
            appStore.runAction(
              resourceAction(resource, ResourceActionType.CREATE)
            );
          }
        }}
      />
    {/if}
  </div>
  {#if $multiSelectStore.length > 0}
    <BottomFloat zIndex="z-30">
      <BulkEditBar
        isConstrainedWidth={$view.isConstrainedWidth ||
          accessPoint === ResourceAccessPoint.BROWSER}
        context={multiSelectContext}
        subContext={selectedSubType +
          (isStarFilterSelected ? "starred" : "") +
          (isArchivedFilterSelected ? "archived" : "")}
        on:selectAll={onSelectAll}
        on:action={onBulkAction}
      />
    </BottomFloat>
  {/if}
{/if}

<ComponentBaseLayer
  syncDownOnMount={true}
  subscribeToResource={new Set([resource])}
  subscribeToContext={new Set([
    accessPoint,
    resourceAction(resource, ResourceActionType.CREATE)
  ])}
  on:syncDown={() => {
    console.log("syncDown - library - refreshing");
    refresh();
  }}
  on:change={onResourceMutation}
/>
