<script lang="ts">
  import Records from "@21n/components/record/Records.svelte";
  import { Size } from "@21n/types/size.enum";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { Arrangement, Orientation } from "@21n/types/direction.enum";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { appStore } from "@21n/stores/app.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint,
    ResourceAccessPointState,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { BulkEditor, SearchStore } from "@21n/components/record/record.store";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";

  import LibrarySearchBox from "@21n/components/library/LibrarySearchBox.svelte";
  import {
    CollectionType,
    type ICollection
  } from "@21n/components/collection/collection.type";
  import {
    NodeType,
    rootNodeTypeList,
    type INode
  } from "@21n/products/memotron/node/node.type";

  import { debouncer } from "@21n/utils/utils";
  import {
    PersistenceActionType,
    RemovalProperty,
    type IMutationParamsv2,
    type IRecordId,
    type IResourceSelectOrderBy
  } from "@21n/types/data.type";
  import LibraryLoadingPulse from "@21n/components/library/LibraryLoadingPulse.svelte";
  import view from "@21n/stores/view.store";
  import { logger } from "@21n/components/debug/logger.client";
  import { intersection } from "@21n/actions/intersection.action";
  import context from "@21n/stores/context.store";
  import { Embed } from "@21n/types/context.type";
  import Icon from "@21n/elements/Icon.svelte";
  import InlineSyncingFeedback from "@21n/elements/feedback/InlineSyncingFeedback.svelte";
  import { enumToString } from "@21n/shared-utils/text.utils";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import { onDestroy, onMount, tick } from "svelte";
  import { page } from "$app/stores";
  import InlineSearchBar from "@21n/elements/InlineSearchBar.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState } from "@21n/stores/uiState/uiState.type";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import { fade, fly } from "svelte/transition";
  import {
    availableResources,
    isSameResource,
    removeDuplicatesFilter,
    resourceAction,
    resourceCacheKey
  } from "@21n/components/flux/resourceStores/resource.utils";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { createEventDispatcher } from "svelte";
  import TaskLibrary from "@21n/components/tasks/TaskLibrary.svelte";
  import LibrarySubTypeSwitcher from "@21n/components/library/LibrarySubTypeSwitcher.svelte";
  import type { SubType } from "@21n/components/library/library.type";
  import { isCustomLibrary } from "@21n/components/library/library.utils";
  import LinkTagsControlPanel from "@21n/products/memotron/linking/LinkTagsControlPanel.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import { dragSelection } from "@21n/actions/dragSelection.action";
  const dispatch = createEventDispatcher();

  enum CacheSubKey {
    DATA = "data",
    STARRED = "starred"
  }

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
  let starredData: any[] = [];
  let searchStore = new SearchStore();
  let QAsearchStore = new SearchStore();
  // QAsearchStore.searchType = SearchType.SEMANTIC;
  let selectedSubType: SubType = "all";
  let isRefreshing: boolean = true;
  let totalCountAfterFilter: number = 0;
  let isRefreshingTotalCount: boolean = false;
  let refreshResetTimeout: any;
  let searchInputRef: InlineSearchBar;
  let isRefineShown = false;
  let subTypeSwitcherRef: LibrarySubTypeSwitcher;
  let abortController: AbortController | null = null;
  let isInSelectionMode = false;
  let bulkEditChangeUnsub: (() => void) | undefined;

  $: multiSelectContext = {
    resource,
    accessPoint
  };

  $: if (bulkEditStore.matchesContext(multiSelectContext)) {
    resolveBulkEditorInstance();
  }

  $: isCustom = isCustomLibrary(resource);
  $: hasChildren = [Resource.node, Resource.goal].includes(resource);

  let pageSub: any;
  onMount(async () => {
    bulkEditChangeUnsub = bulkEditStore.count.subscribe((count) => {
      if (count === 0) {
        isInSelectionMode = false;
      }
    });
    if (isCustom) return;
    abortController = new AbortController();
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
    refresh();
  });

  onDestroy(() => {
    if (pageSub) pageSub();
    // Abort any ongoing operations when component unmounts
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (refreshResetTimeout) {
      clearTimeout(refreshResetTimeout);
    }
    if (bulkEditChangeUnsub) bulkEditChangeUnsub();
    if (bulkEditStore.matchesContext(multiSelectContext)) {
      bulkEditStore.clear();
    }
  });

  function resolveBulkEditSubContext() {
    return (
      selectedSubType +
      (isStarFilterSelected ? "starred" : "") +
      (isArchivedFilterSelected ? "archived" : "")
    );
  }

  function resolveBulkEditorInstance() {
    bulkEditStore.activate(multiSelectContext, {
      onAction: onBulkAction,
      onSelectAll: onSelectAll,
      subContext: resolveBulkEditSubContext()
    });
  }

  function onSelectAll() {
    return data.map((x) => x.id);
  }

  async function onBulkAction(
    ids: IRecordId[],
    action: string,
    actionData?: unknown
  ) {
    try {
      const editor = new BulkEditor(resource, bulkEditStore);
      await editor.run(action, actionData);
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }

  async function refreshFilteredRecordsCount() {
    const filters = resolveFilters();
    await _refreshFilteredRecordsTotalCount(filters);
  }

  async function refresh(isPagination?: boolean) {
    if (isCustom) return;

    // Abort any previous operation and create new controller
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    logger.log({
      at: "LibraryRecordsPane - refresh",
      isPagination,
      resource,
      selectedSubType
    });
    console.time("LibraryRecordsPane - refresh");
    if (!availableResources.has(resource)) {
      data = [];
      return;
    }
    if (isPagination !== true) {
      isRefreshing = true;
      data = [];
    }
    try {
      const cacheKey = resourceCacheKey(
        resource,
        CacheKey.LIBRARY_DEFAULT_RECORDS
      );
      let orderBy: IResourceSelectOrderBy | undefined;
      let semanticSearchTopK: number | undefined;
      // if (searchStore.searchType == SearchType.SEMANTIC) {
      //   orderBy = {
      //     dist: "desc",
      //     createdAt: "desc"
      //   };
      // }
      subTypeSwitcherRef?.refresh();
      const isDefaultLoad = resolveIfDefaultLoad();
      if (!isPagination && isDefaultLoad) {
        const cachedData = cache.retrieve(cacheKey);
        if (cachedData) {
          isRefreshing = false;
          data = cachedData[CacheSubKey.DATA] ?? [];
          starredData = cachedData[CacheSubKey.STARRED] ?? [];
        }
        const cachedTotalCount = cache.retrieve(
          resourceCacheKey(resource, CacheKey.COUNT)
        );
        if (cachedTotalCount) {
          totalCountAfterFilter = cachedTotalCount;
        }
      }
      const filters = resolveFilters();
      const newData = await searchStore.select({
        resource,
        searchQuery,
        filters,
        orderBy,
        semanticSearchTopK,
        limit: 50,
        offset: isPagination ? data.length : 0,
        signal
      });
      if (isPagination)
        data = [...data, ...newData]?.filter(removeDuplicatesFilter);
      else {
        data = [...newData];
        if (isDefaultLoad)
          cache.replaceUsingSubKey(cacheKey, CacheSubKey.DATA, data);
      }
      if (isConstrainedWidth && !searchQuery) {
        starredData =
          (await searchStore.select({
            resource,
            filters: {
              ...filters,
              isStarred: true
            },
            signal
          })) ?? [];
        if (isDefaultLoad)
          cache.replaceUsingSubKey(cacheKey, CacheSubKey.STARRED, starredData);
      }
      clearTimeout(refreshResetTimeout);
      refreshResetTimeout = setTimeout(() => {
        isRefreshing = false;
      }, 1);
      await _refreshFilteredRecordsTotalCount(filters);
      console.timeEnd("LibraryRecordsPane - refresh");
    } catch (e) {
      isRefreshing = false;
      // Don't log error if it was just an abort
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "Library - refresh - aborted", e });
      } else {
        logger.error({ at: "Library - refresh", e });
      }
    }
  }

  function isGenericSubType() {
    return ["all", "starred", "recents"].includes(selectedSubType);
  }

  /**
   * Resolves if the current load is a default load i.e. no filters applied and the first load that happens after the page is loaded.
   */
  function resolveIfDefaultLoad() {
    return (
      selectedSubType === "all" &&
      !searchQuery &&
      !isStarFilterSelected &&
      !isArchivedFilterSelected
    );
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
          : isConstrainedWidth && !searchQuery
            ? false
            : undefined,
      isArchived: isArchivedFilterSelected ? true : undefined
    };
  }

  async function _refreshFilteredRecordsTotalCount(filters: any) {
    try {
      // Check if operation was aborted before starting
      if (abortController?.signal?.aborted) {
        return;
      }

      isRefreshingTotalCount = true;
      totalCountAfterFilter = await searchStore.resolveCount({
        resource,
        subType: !isGenericSubType()
          ? (selectedSubType.toUpperCase() as NodeType | CollectionType)
          : undefined,
        filters,
        signal: abortController?.signal
      });
      isRefreshingTotalCount = false;
    } catch (e) {
      if (e instanceof Error && e.message === "Operation aborted") {
        logger.log({ at: "Library - refreshTotalCounts - aborted", e });
      } else {
        logger.error({ at: "Library - refreshTotalCounts", e });
      }
      isRefreshingTotalCount = false;
    }
  }

  const debouncedSearch = debouncer(refresh, 500);

  function resolveFooterMessage(data: any[], totalCount: number) {
    if (!data || !data.length) return;
    let prefix = "Showing " + data.length + " ";
    const label = resolveResourceLabel();
    if (isStarFilterSelected)
      return `${prefix} ⭐️ staaarrrrrred ${label} ${hasChildren ? "including sub " + label : ""}`;
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
      let txt = enumToString(selectedSubType).toLowerCase();
      if (selectedSubType === NodeType.NODULAR_MARKDOWN.toLowerCase()) {
        txt = "markdown";
      }
      label = ` ${txt} ${resource}`;
    } else label = resource;
    return label + ((data && data.length > 1) || isPlural ? "s" : "");
  }

  /**
   *
   * For nodes, filters nodes if has isArchived or trashInformation i.e. deleted or archived irrespective of whether its a root node or md block node as md blocks are anyways not present in data. Currently does full refresh for unarchive or undelete which is optimal if the nodes are root nodes.
   *
   *
   * For goal merge - children is being listened to handle the cases of conversion of goal to sub goal and sub goal to a root goal etc.
   *
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
    logger.log({
      at: "LibraryRecordsPane - onResourceMutation",
      resource,
      ...mutation
    });
    if (
      mutation.action === PersistenceActionType.MERGE &&
      Object.values(RemovalProperty).some((x) => mutation.record[x])
    ) {
      const id = mutation.record.id;
      await refreshFilteredRecordsCount();
      if (id) data = data.filter((x) => !isSameResource(x.id, id));
      if (id)
        starredData = starredData.filter((x) => !isSameResource(x.id, id));
      return;
    }
    if (
      isConstrainedWidth &&
      !searchQuery &&
      mutation.action === PersistenceActionType.MERGE &&
      "isStarred" in mutation.record
    ) {
      const id = mutation.record.id;
      if (!id) return;
      if (
        mutation.record.isStarred &&
        !starredData.find((x) => isSameResource(x.id, id))
      ) {
        const item = data.find((x) => isSameResource(x.id, id));
        if (item) {
          starredData = [...starredData, item];
          data = data.filter((x) => !isSameResource(x.id, id));
          totalCountAfterFilter = totalCountAfterFilter - 1;
        }
      } else {
        const item = starredData.find((x) => isSameResource(x.id, id));
        starredData = starredData.filter((x) => !isSameResource(x.id, id));
        data = [...data, item];
        totalCountAfterFilter = totalCountAfterFilter + 1;
      }
      return;
    }
    if (
      mutation.action === PersistenceActionType.MERGE &&
      resource === Resource.goal
    ) {
      if (!("children" in mutation.record)) return;
    } else if (mutation.action === PersistenceActionType.MERGE) return;

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
    <div class="flex items-center w-full gap-2 px-2 h-12 min-h-12">
      <InlineSearchBar
        bind:this={searchInputRef}
        bind:query={searchQuery}
        padding="px-2"
        on:search={() => refresh()}
        placeholder={"Search " + resource + "s"}
        style={InputStyle.FILLED}
      >
        <Toggle
          bind:on={isRefineShown}
          icon="sliders-horizontal"
          tooltip="Settings & filters"
          size={Size.lg}
          bgSize={Size.sm}
        />
      </InlineSearchBar>
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
              icon: "list",
              value: Arrangement.LIST
            },
            {
              label: "Grid",
              icon: "grid",
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
      </div>
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
  <div
    class="flex flex-col gap-4 px-4 overflow-auto-scrollbar grow"
    id="records-container"
  >
    <InlineSyncingFeedback {resource} />
    {#if isConstrainedWidth && !searchQuery && starredData && starredData.length > 0}
      <div class="flex flex-col gap-2">
        <Text content="Starred" style={TextStyle.SECTION_HEADING} />
        <Records
          data={starredData}
          {accessPoint}
          {accessPointState}
          {resource}
          defaultAccessMode={accessPoint === ResourceAccessPoint.LIBRARY ||
          $view.isConstrainedWidth
            ? ResourceAccessMode.POP
            : ResourceAccessMode.INLINE}
          size={$view.isConstrainedWidth ||
          accessPoint === ResourceAccessPoint.BROWSER
            ? Size.sm
            : Size.md}
          arrangement={resolveArrangement(arrangement)}
        />
        {#if data.length > 0}
          <div class="mt-4 -mb-2">
            <Text content="Other" style={TextStyle.SECTION_HEADING} />
          </div>
        {/if}
      </div>
    {/if}
    {#if isRefreshing}
      <LibraryLoadingPulse {isConstrainedWidth} {arrangement} />
    {:else if data && data.length > 0}
      <div
        use:dragSelection={{
          selectableSelector: "div[id^='thumbnail-']",
          containerId: "records-container",
          onSelectionChange: (elements, ids) => {
            resolveBulkEditorInstance();
            if (!ids || ids.length === 0) {
              bulkEditStore.reset();
              isInSelectionMode = false;
              return;
            }
            const state = bulkEditStore.getState();
            if (isInSelectionMode) {
              bulkEditStore.select([
                ...new Set([...state.selectedIds, ...ids])
              ]);
            } else {
              isInSelectionMode = true;
              bulkEditStore.select(ids);
            }
            isInSelectionMode = bulkEditStore.getState().selectedIds.length > 0;
          }
        }}
      >
        <Records
          {data}
          {accessPoint}
          {accessPointState}
          {resource}
          defaultAccessMode={accessPoint === ResourceAccessPoint.LIBRARY ||
          $view.isConstrainedWidth
            ? ResourceAccessMode.POP
            : ResourceAccessMode.INLINE}
          size={$view.isConstrainedWidth ||
          accessPoint === ResourceAccessPoint.BROWSER
            ? Size.sm
            : Size.md}
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
        {:else if !isConstrainedWidth}
          {resolveFooterMessage(data, totalCountAfterFilter) ?? ""}
        {/if}
      </div>
      <ScrollViewBottomSpacer />
    {:else if data.length === 0 && ((starredData && starredData.length === 0) || !starredData || searchQuery)}
      <EmptyStatusView
        size={Size.lg}
        {...resolveEmptyStateMessage()}
        isSearchContext={true}
        actionText={resource === Resource.node &&
        $context.embed !== Embed.HANDSET
          ? "Install chrome extension"
          : resource !== Resource.node
            ? "Create new " + resource
            : undefined}
        on:click={() => {
          if (resource === Resource.node) {
            appStore.openLink(
              $appStore.appData?.urls?.chromeExtension ?? "https://memotron.app"
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
{/if}

<ComponentBaseLayer
  syncDownOnMount={true}
  subscribeToResource={new Set([resource])}
  on:syncDown={() => {
    refresh();
  }}
  on:change={onResourceMutation}
/>
