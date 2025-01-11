<script lang="ts">
  import FloatingButton from "$lib/client/elements/button/FloatingButton.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import Records from "$lib/client/components/record/Records.svelte";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ResourceSwitcher from "./resourceSwitcher/ResourceSwitcher.svelte";
  import {
    OptionSelectorStyle,
    type IResourceSwitchItem,
    type ISelectItem
  } from "$lib/client/types/select.type";
  import { appStore } from "$lib/client/stores/app.store";
  import {
    isSameResource,
    resourceAction
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import BulkEditBar from "$lib/client/components/record/BulkEditBar.svelte";
  import {
    BulkEditor,
    SearchStore
  } from "$lib/client/components/record/record.store";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import LibrarySearchBox from "$lib/client/components/library/LibrarySearchBox.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import {
    CollectionType,
    type ICollection
  } from "$lib/client/components/collection/collection.type";
  import {
    NodeType,
    rootNodeTypeList,
    type INode
  } from "$lib/client/products/memotron/node/node.type";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import {
    resolveNodeIcon,
    resolveNodeContentLabel
  } from "$lib/client/products/memotron/node/node.utils";
  import {
    resolveCollectionTypeIcon,
    resolveCollectionTypeLabel
  } from "$lib/client/components/collection/collection.utils";
  import { debouncer } from "$lib/client/utils/utils";
  import {
    PersistenceActionType,
    SearchType,
    type IMutationParamsv2,
    type IResourceSelectOrderBy
  } from "$lib/client/types/data.type";
  import { page } from "$app/stores";
  import LibraryLoadingPulse from "$lib/client/components/library/LibraryLoadingPulse.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import view from "$lib/client/stores/view.store";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { intersection } from "$lib/client/actions/intersection.action";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { toasts } from "$lib/client/stores/notification.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import SyncStatusPropagator from "$lib/client/elements/feedback/SyncStatusPropagator.svelte";
  import InlineSyncingFeedback from "$lib/client/elements/feedback/InlineSyncingFeedback.svelte";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import {
    isValidArray,
    isValidArrayWithData
  } from "$lib/shared/utils/obj.utils";

  export let resources: Resource[] = [];

  let searchQuery: string = "";
  let selectedResource: Resource = Resource.node;
  let isStickied: boolean = false;
  let isStarFilterSelected: boolean = false;
  let isArchivedFilterSelected: boolean = false;
  let data: any[] = [];
  let searchStore = new SearchStore();
  let QAsearchStore = new SearchStore();
  QAsearchStore.searchType = SearchType.SEMANTIC;
  type SubType = "all" | "recents" | NodeType | CollectionType;
  let selectedSubType: SubType = "all";
  let isRefreshing: boolean = false;
  let resourceSwitcherRef: ResourceSwitcher;
  let totalCount: number = 0;
  let isRefreshingTotalCount: boolean = false;
  let availableResources: Set<Resource> = new Set([
    Resource.node,
    Resource.collection
  ]);
  let isSyncing: boolean = false;
  let syncStatusPropagatorRef: SyncStatusPropagator;
  let subTypeCounts: { count: number; type: NodeType | CollectionType }[] = [];
  let isExpandableSubTypes: boolean = false;
  let isExpandSubTypes: boolean = false;
  let allSubTypes: ISelectItem[] = [];
  let renderedSubTypes: ISelectItem[] = [];

  const resourceList: IResourceSwitchItem[] = [
    {
      label: "Nodes",
      value: Resource.node,
      icon: "ph:hexagon-light"
    },
    {
      label: "Collections",
      value: Resource.collection,
      icon: "ph:brackets-round-light",
      isPinned: true
    },
    {
      label: "Combinations",
      value: Resource.combination,
      icon: "ph:bounding-box-light",
      badge: "Planned",
      isDisabled: true
    },
    {
      label: "Tasks",
      value: Resource.task,
      icon: "ph:check-circle-light",
      badge: "Planned",
      isDisabled: true
    },
    {
      label: "Events",
      value: Resource.event,
      icon: "ph:calendar-light"
    },
    {
      label: "Habits",
      value: Resource.habit,
      icon: "ph:caret-circle-up-light"
    },
    {
      label: "Sessions",
      value: Resource.session,
      icon: "ph:clock-light"
    },
    {
      label: "Things",
      value: Resource.thing,
      icon: "ph:bicycle-light"
    },
    {
      label: "Feeds",
      value: Resource.feed,
      icon: "ph:rss-light"
    },
    {
      label: "Sources",
      value: Resource.source,
      icon: "ph:globe-light"
    },
    {
      label: "Accounts",
      value: Resource.account,
      icon: "ph:bank-light"
    },
    {
      label: "Transactions",
      value: Resource.transaction,
      icon: "ph:arrows-left-right-light"
    }
  ];
  const resourcesWithExpandableSubTypes = [Resource.node];

  $: isExpandableSubTypes =
    resourcesWithExpandableSubTypes.includes(selectedResource);

  let _resources: IResourceSwitchItem[] = [];

  $: _resources = resourceList.filter((x) =>
    resources.includes(x.value as Resource)
  );

  $: multiSelectContext = {
    resource: selectedResource,
    accessPoint: ResourceAccessPoint.LIBRARY
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  $: isConstrainedWidth = $view.isConstrainedWidth;

  $: floatingButton =
    $multiSelectStore.length > 0 || !availableResources.has(selectedResource)
      ? undefined
      : {
          label: "Create new " + selectedResource,
          callback: async () => {
            onCreateResource();
          },
          icon: "ph:plus-light",
          variant: ButtonVariant.PRIMARY,
          style: ButtonStyle.DEFAULT
        };

  onMount(() => {
    const pageSub = page.subscribe(async (p) => {
      const resourceParam = p.url.searchParams.get("resource");
      const subResourceParam = p.url.searchParams.get("type");
      if (
        (resourceParam && resourceParam !== selectedResource) ||
        (subResourceParam && subResourceParam !== selectedSubType)
      ) {
        selectedResource =
          (resourceParam as Resource) ?? selectedResource ?? Resource.node;
        selectedSubType = (subResourceParam as SubType) ?? "all";
        await refresh();
      }
    });
    refresh();
    return () => {
      pageSub();
    };
  });
  let refreshResetTimeout: any;
  async function refresh(isPagination?: boolean) {
    logger.log({ at: "Library - refresh", isPagination, selectedResource });
    if (!availableResources.has(selectedResource)) {
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
      if (searchStore.searchType == SearchType.SEMANTIC) {
        orderBy = {
          dist: "desc",
          createdAt: "desc"
        };
      }
      const filters = resolveFilters();
      const newData = await searchStore.select({
        resource: selectedResource,
        searchQuery,
        filters,
        orderBy,
        semanticSearchTopK,
        limit: 50,
        offset: isPagination ? data.length : 0
      });
      if (isPagination) data = [...data, ...newData];
      else data = [...newData];
      clearTimeout(refreshResetTimeout);
      refreshResetTimeout = setTimeout(() => {
        isRefreshing = false;
      }, 1);
      await refreshTotalRecordCounts(filters);
      await refreshSubTypeSwitcher();
    } catch (e) {
      isRefreshing = false;
      logger.error({ at: "Library - refresh", e });
    }
  }

  function resolveFilters() {
    let filters: any = resolveBaseFilters();
    if (selectedSubType !== "all" && selectedSubType !== "recents") {
      if (selectedResource === Resource.node) {
        filters = { ...filters, contentType: selectedSubType };
      } else if (selectedResource === Resource.collection) {
        filters = { ...filters, type: selectedSubType };
      }
    }
    return filters;
  }

  function resolveBaseFilters() {
    return {
      isStarred: isStarFilterSelected ? true : undefined,
      isArchived: isArchivedFilterSelected ? true : undefined
    };
  }

  async function refreshTotalRecordCounts(filters: any) {
    try {
      isRefreshingTotalCount = true;
      await resourceSwitcherRef?.refresh(selectedResource);
      totalCount = await searchStore.resolveCount(
        selectedResource,
        selectedSubType !== "all" && selectedSubType !== "recents"
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

  async function refreshSubTypeSwitcher() {
    try {
      const filters = resolveBaseFilters();
      subTypeCounts = await searchStore.resolveSubTypeCounts(
        selectedResource,
        filters
      );
      allSubTypes = resolveSubItems(selectedResource);
      if (isValidArrayWithData(subTypeCounts)) {
        allSubTypes = allSubTypes.map((x) => {
          const count = subTypeCounts.find(
            (y: { type: any; count: number }) =>
              y.type?.toLowerCase() === x.value?.toLowerCase()
          )?.count;
          return {
            ...x,
            badge: count ? count : undefined
          };
        });
      }
      if (!isExpandableSubTypes || isExpandSubTypes) {
        renderedSubTypes = [...allSubTypes];
        return;
      }
      renderedSubTypes = [...allSubTypes].filter(
        (x) => x.value === "all" || (x.badge && x.badge > 0)
      );
    } catch (e) {
      logger.error({ at: "Library - refreshSubTypeCountsAndSort", e });
    }

    function resolveSubItems(resource: Resource) {
      const items: ISelectItem[] = [
        {
          label: "All",
          value: "all",
          icon: "ph:asterisk-light"
        }
        //Note: Right now - all is already sorted by recents
        // {
        //   label: "Recently opened",
        //   value: "recents",
        //   icon: "ph:clock"
        // }
      ];

      if (resource === Resource.node) {
        const nodeTypes = [
          NodeType.NODULAR_MARKDOWN,
          NodeType.PDF,
          NodeType.IMAGE,
          NodeType.AUDIO,
          NodeType.VIDEO,
          NodeType.WEB_PAGE,
          NodeType.GIST,
          NodeType.TEXT_CLIP,
          NodeType.WEB_SCREENSHOT_CLIP,
          NodeType.TWEET,
          NodeType.TWITTER_PROFILE,
          NodeType.YOUTUBE_VIDEO,
          NodeType.YOUTUBE_TIMESTAMP_CLIP,
          NodeType.KINDLE_BOOK,
          NodeType.KINDLE_HIGHLIGHT
        ].map((x) => {
          return {
            label: resolveNodeContentLabel(x),
            value: x.toLowerCase(),
            icon: resolveNodeIcon(x)
          };
        });
        items.push(...nodeTypes);
      } else if (resource === Resource.collection) {
        const collectionTypes = [
          CollectionType.UNTYPED,
          CollectionType.TYPED,
          CollectionType.QUERY
        ].map((x) => {
          return {
            label: resolveCollectionTypeLabel(x),
            value: x.toLowerCase(),
            icon: resolveCollectionTypeIcon(x)
          };
        });
        items.push(...collectionTypes);
      }
      return items;
    }
  }

  const debouncedSearch = debouncer(refresh, 500);

  function onScroll() {
    var elementTarget = document.querySelector(".resource-switcher");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    // console.log({ elementTarget, positionFromTop });
    isStickied = positionFromTop ? positionFromTop <= 0 : false;
  }

  function resolveFooterMessage(data: any[], totalCount: number) {
    if (!data || !data.length) return;
    let prefix = "Showing " + data.length + " ";
    const label = resolveResourceLabel();
    if (isStarFilterSelected) return `${prefix} ⭐️ staaarrrrrrrrrred ${label}`;
    else if (searchQuery)
      return `${prefix} ${label} containing "${searchQuery}"`;
    else return `Showing ${data.length} of ${totalCount ?? "Unknown"} ${label}`;
  }

  function resolveResourceLabel(isPlural: boolean = false) {
    let label = "items";
    if (selectedResource === Resource.everything) label = "item";
    else if (selectedSubType && selectedSubType !== "all") {
      label = ` ${enumToString(selectedSubType).toLowerCase()} ${selectedResource}`;
    } else label = selectedResource;
    return label + ((data && data.length > 1) || isPlural ? "s" : "");
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
        subText: `Please try a different search.`
      };
    else {
      if (selectedResource === Resource.node) {
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

  function onSelectAll() {
    $multiSelectStore = data.map((x) => x.id);
  }

  async function onBulkAction(e: CustomEvent<string>) {
    try {
      const editor = new BulkEditor(selectedResource, multiSelectStore);
      await editor.run(e.detail);
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
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
    const watchProperties = ["isArchived", "trashInformation"];
    const resource = e.detail.resource;
    const mutation = e.detail.params;
    logger.log({ at: "Library - onResourceMutation", resource, ...mutation });
    if (
      mutation.action === PersistenceActionType.MERGE &&
      watchProperties.some((x) => mutation.record[x])
    ) {
      const id = mutation.record.id;
      if (id) data = data.filter((x) => !isSameResource(x.id, id));
      const filters = resolveFilters();
      await refreshTotalRecordCounts(filters);
      return;
    }

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
    refresh();
  }

  function onCreateResource() {
    appStore.runAction(
      resourceAction(selectedResource, ResourceActionType.CREATE)
    );
  }
</script>

<div class="relative w-full h-full">
  <Panel title="Library" {floatingButton}>
    <div class="flex py-5">
      <ResourceSwitcher
        options={_resources}
        selected={selectedResource}
        isShowCount={true}
        bind:this={resourceSwitcherRef}
        on:select={(e) => {
          appStore.toggleSearchParam({
            resource: e.detail,
            type: "all"
          });
          syncStatusPropagatorRef?.refresh(e.detail);
        }}
      />
    </div>
    <div class="flex flex-col gap-4 w-full" slot="right">
      <LibrarySearchBox
        {selectedSubType}
        resources={_resources}
        {isStickied}
        {searchStore}
        bind:selectedResource
        bind:searchQuery
        isShowAddButton={availableResources.has(selectedResource)}
        on:refresh={debouncedSearch}
        on:create={onCreateResource}
        on:semanticSearch={(e) => {
          if (e.detail) {
            searchStore.searchType = SearchType.SEMANTIC;
          } else {
            searchStore.searchType = SearchType.FULL_TEXT;
          }
          refresh();
        }}
      />
      <div class="flex px-4 gap-2">
        <OptionSelector
          style={OptionSelectorStyle.OUTLINE}
          size={Size.sm}
          options={renderedSubTypes}
          selected={selectedSubType}
          on:select={(e) => {
            if (!e?.detail) return;
            appStore.toggleSearchParam({
              type: e.detail.toLowerCase()
            });
          }}
        />
        {#if !isExpandSubTypes}
          <Divider orientation={Orientation.Vertical} />
        {/if}
        <div class="flex gap-1">
          {#if !isExpandSubTypes}
            <Toggle
              bind:on={isStarFilterSelected}
              icon="ph:star-light"
              tooltip="Show starred items"
              bgSize={Size.sm}
              on:change={() => refresh()}
            />
            <Toggle
              bind:on={isArchivedFilterSelected}
              icon="ph:archive-light"
              tooltip="Show archived items"
              on:change={() => refresh()}
              bgSize={Size.sm}
            />
          {/if}
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
      <div class="flex flex-col gap-4 px-4 overflow-auto grow">
        {#if isRefreshing}
          <LibraryLoadingPulse resource={selectedResource} />
        {:else if data && data.length > 0}
          <InlineSyncingFeedback {isSyncing} isFullWidthVariant={true} />
          <div>
            <Records
              {data}
              accessPoint={ResourceAccessPoint.LIBRARY}
              resource={selectedResource}
              size={$view.isConstrainedWidth ? Size.sm : Size.md}
              isShowLoadingPulseAtTheEnd={data.length < totalCount &&
                !searchQuery}
              arrangement={$view.isConstrainedWidth
                ? selectedResource === Resource.node
                  ? Arrangement.GRID
                  : Arrangement.LIST
                : Arrangement.GRID}
            />
          </div>
          <div
            class="flex w-full justify-center text-b2 text-fgs3"
            use:intersection={{
              rootMargin: "100px",
              callback: () => {
                refresh(true);
              }
            }}
          >
            {#if isRefreshingTotalCount}
              <Icon icon="svg-spinners:3-dots-fade" />
            {:else}
              {resolveFooterMessage(data, totalCount) ?? ""}
            {/if}
          </div>
          <ScrollViewBottomSpacer />
        {:else}
          <EmptyStatusView
            size={Size.lg}
            {...resolveEmptyStateMessage()}
            isSearchContext={true}
            actionText={selectedResource === Resource.node &&
            $context.embed !== Embed.HANDSET
              ? "Install chrome extension"
              : undefined}
            on:click={() => {
              appStore.openLink(
                $appStore.appData?.urls?.chromeExtension ??
                  "https://memotron.io"
              );
            }}
          />
        {/if}
      </div>
    </div>
  </Panel>

  {#if $multiSelectStore.length > 0}
    <BottomFloat zIndex="z-30">
      <BulkEditBar
        {isConstrainedWidth}
        context={multiSelectContext}
        subContext={selectedSubType +
          (isStarFilterSelected ? "starred" : "") +
          (isArchivedFilterSelected ? "archived" : "")}
        on:selectAll={onSelectAll}
        on:action={onBulkAction}
      />
    </BottomFloat>
  {/if}
</div>

<SyncStatusPropagator
  bind:this={syncStatusPropagatorRef}
  resource={selectedResource}
  bind:isSyncing
/>

<ComponentBaseLayer
  syncDownOnMount={true}
  subscribeToResource={availableResources}
  subscribeToContext={new Set([
    ResourceAccessPoint.LIBRARY,
    ...resources.map((x) => resourceAction(x, ResourceActionType.CREATE))
  ])}
  on:syncDown={() => refresh()}
  on:change={onResourceMutation}
/>

<style>
  input::placeholder {
    font-weight: lighter;
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
