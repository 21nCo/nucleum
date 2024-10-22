<script lang="ts">
  import FloatingButton from "$lib/client/elements/button/FloatingButton.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import Resources from "../common/Resources.svelte";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ResourceSwitcher from "$lib/client/elements/switcher/resourceSwitcher/ResourceSwitcher.svelte";
  import type {
    IResourceSwitchItem,
    ISelectItem
  } from "$lib/client/types/select.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import BulkEditBar from "../common/BulkEditBar.svelte";
  import { collectionStore } from "../collection/collection.store";
  import { SearchStore } from "../memotron.store";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { nodeStore } from "../node/node.store";
  import LibrarySearchBox from "./LibrarySearchBox.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { MemotronAction } from "../memotronAction.enum";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { CollectionType } from "../collection/collection.type";
  import { NodeType } from "../node/node.type";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import VerticalSwitcher from "$lib/client/elements/switcher/VerticalSwitcher.svelte";
  import { VerticalSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { resolveNodeIcon, resolveNodeContentLabel } from "../node/node.utils";
  import {
    resolveCollectionTypeIcon,
    resolveCollectionTypeLabel
  } from "../collection/collection.utils";
  import { debouncer } from "$lib/client/utils/utils";
  import {
    PersistenceActionType,
    SearchType,
    type IResourceSelectOrderBy
  } from "$lib/client/types/data.type";
  import { page } from "$app/stores";
  import LibraryLoadingPulse from "./LibraryLoadingPulse.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import view from "$lib/client/stores/view.store";

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
  export let variant: "v1" | "v2" | "v3" = "v3";
  let isRefreshing: boolean = false;
  let availableResources: Resource[] = [
    Resource.node,
    Resource.collection
    // Resource.file,
    // Resource.task
  ];
  const commonResourceProps = {
    isHidePinAction: true
  };
  const resources: IResourceSwitchItem[] = [
    // {
    //   ...commonResourceProps,
    //   value: Resource.everything,
    //   icon: "tag"
    // },
    {
      ...commonResourceProps,
      label: "Nodes",
      value: Resource.node,
      icon: "ph:circle-bold"
    },
    {
      ...commonResourceProps,
      label: "Collections",
      value: Resource.collection,
      icon: "ph:circles-four",
      isPinned: true
    },
    {
      ...commonResourceProps,
      label: "Combinations",
      value: Resource.combination,
      icon: "ph:bounding-box-light"
    },
    // {
    //   ...commonResourceProps,
    //   label: "Files",
    //   value: Resource.file,
    //   icon: "ph:file"
    // },
    {
      ...commonResourceProps,
      label: "Tasks",
      value: Resource.task,
      icon: "ph:check-circle"
    }
  ];

  $: multiSelectContext = selectedResource + "-" + ResourceAccessPoint.LIBRARY;
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

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

  async function refresh() {
    isRefreshing = true;
    try {
      if (
        !availableResources.includes(selectedResource) &&
        selectedResource != Resource.everything
      ) {
        data = [];
        return;
      }
      let orderBy: IResourceSelectOrderBy | undefined;
      let semanticSearchTopK: number | undefined;
      if (searchStore.searchType == SearchType.SEMANTIC) {
        orderBy = {
          dist: "desc",
          createdAt: "desc"
        };
      }

      let filters: any = {
        isStarred: isStarFilterSelected ? true : undefined,
        isArchived: isArchivedFilterSelected ? true : undefined
      };
      if (selectedSubType !== "all" && selectedSubType !== "recents") {
        if (selectedResource === Resource.node) {
          filters = { ...filters, contentType: selectedSubType };
        } else if (selectedResource === Resource.collection) {
          filters = { ...filters, type: selectedSubType };
        }
      }

      data = await searchStore.select({
        resource: selectedResource,
        searchQuery,
        filters,
        orderBy,
        semanticSearchTopK
        // limit: 100
      });
    } finally {
      setTimeout(() => {
        isRefreshing = false;
      }, 1);
    }
  }
  const debouncedSearch = debouncer(refresh, 500);

  function onScroll() {
    var elementTarget = document.querySelector(".resource-switcher");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    // console.log({ elementTarget, positionFromTop });
    isStickied = positionFromTop ? positionFromTop <= 0 : false;
  }
  function resolveFooterMessage(data: any[]) {
    if (!data || !data.length) return;
    let prefix = "Showing " + data.length + " ";
    const label = resolveResourceLabel();
    if (isStarFilterSelected) return prefix + `⭐️ staaarrrrrrrrrred ` + label;
    else if (searchQuery)
      return prefix + label + ` containing "${searchQuery}"`;
    else return "Showing all " + data.length + " " + label;
  }
  function resolveResourceLabel(isPlural: boolean = false) {
    let label = "items";
    if (selectedResource === Resource.everything) label = "item";
    else label = selectedResource;
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
  async function onBulkAction(action: string) {
    if (selectedResource === Resource.everything) return;
    if (selectedResource === Resource.node) {
      if (action === "archive") {
        await nodeStore.bulkModify($multiSelectStore, {
          isArchived: true
        });
      } else if (action === "delete") {
        await nodeStore.bulkTrash($multiSelectStore);
      } else if (action === "star") {
        await nodeStore.bulkModify($multiSelectStore, {
          isStarred: true
        });
      }
      return;
    }
    if (selectedResource === Resource.collection) {
      if (action === "archive") {
        await collectionStore.bulkModify($multiSelectStore, {
          isArchived: true
        });
      } else if (action === "delete") {
        await collectionStore.bulkTrash($multiSelectStore);
      } else if (action === "star") {
        await collectionStore.bulkModify($multiSelectStore, {
          isStarred: true
        });
      }
    }
    $multiSelectStore = [];
    await refresh();
  }

  function resolveSubItems(resource: Resource) {
    const items: ISelectItem[] = [
      {
        label: "All",
        value: "all",
        icon: "ph:asterisk"
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
  /**
   * Disabling refresh on node merge mutations to avoid flickering effect in the background for repeated refreshes when editing a markdown node
   * @param e
   */
  function onResourceMutation(
    e: CustomEvent<{ resource: Resource; params: any }>
  ) {
    if (
      e.detail.resource === Resource.node &&
      e.detail.params.action === PersistenceActionType.MERGE
    ) {
      return;
    }
    refresh();
  }

  function onCreateResource() {
    if (selectedResource === Resource.node) {
      appStore.runAction(MemotronAction.CAPTURE);
    } else {
      appStore.runAction(
        resourceAction(selectedResource, ResourceActionType.CREATE)
      );
    }
  }
</script>

<div class="relative w-full h-full">
  <div
    class={cn("relative w-full h-full flex flex-col overflow-auto", {})}
    on:scroll={onScroll}
  >
    {#if $userPreferences.localAI.semanticSearch && $userPreferences.localAI.markdownQAChat}
      <FloatingButton
        class="justify-end"
        params={{
          callback: () => {
            appStore.runAction(MemotronAction.OPEN_CHAT);
          },
          icon: "ph:chat",
          variant: ButtonVariant.PRIMARY
        }}
      />
    {/if}
    {#if variant === "v1" || variant === "v3"}
      <LibrarySearchBox
        {selectedSubType}
        {variant}
        {resources}
        {isStickied}
        {searchStore}
        bind:selectedResource
        bind:searchQuery
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
    {/if}
    <div
      class="resource-switcher flex w-full gap-2 justify-between items-center mo:px-4 px-5 mo:py-3 py-5 sticky-disabled bg-bgs1 top-0 z-10"
    >
      <span
        class={cn("flex overflow-auto", {
          "flex-1": selectedResource != Resource.everything,
          "w-full": selectedResource === Resource.everything
        })}
      >
        <ResourceSwitcher
          options={resources}
          selected={selectedResource}
          on:select={(e) => {
            appStore.toggleSearchParam({
              resource: e.detail,
              type: "all"
            });
          }}
          size={variant === "v2" ? Size.md : Size.sm}
        />
      </span>
      {#if selectedResource != Resource.everything && !$view.isConstrainedWidth}
        <span>
          <span class="flex gap-2 items-center">
            {#if availableResources.includes(selectedResource)}
              <!-- <Button icon={resolveIfPinned() ? "unpin" : "pin"} size={Size.lg} /> -->
              <!-- <Toggle
          icon={resolveIfPinned() ? "unpin" : "pin"}
          bind:on={isFiltersVisible}
          size={Size.sm}
        /> -->
              <Button
                icon="plus"
                size={Size.sm}
                type={ButtonVariant.PRIMARY}
                style={ButtonStyle.OUTLINED}
                label={selectedResource}
                isPreventMinWidth={true}
                on:click={onCreateResource}
              />
            {/if}
          </span>
        </span>
      {/if}
    </div>
    {#if variant === "v2"}
      <Divider colorStrength={ColorStrength.Strong} />
    {/if}
    <main
      class={cn("flex w-full", {
        grow: variant === "v1",
        "flex-grow px-5 gap-5": variant === "v2" || variant === "v3"
      })}
    >
      {#if (variant === "v2" || variant === "v3") && availableResources.includes(selectedResource) && !$view.isConstrainedWidth}
        <div class="flex flex-col w-60 border-r border-r-brs2 mb-1">
          <span class="w-full flex items-start flex-1 pr-2 overflow-y-auto">
            <VerticalSwitcher
              labelOrientation={Orientation.Horizontal}
              style={VerticalSwitcherStyle.BG}
              itemProps={{ isHideLabel: false, size: Size.sm }}
              items={resolveSubItems(selectedResource)}
              selected={selectedSubType}
              on:switch={(e) => {
                if (!e?.detail) return;
                appStore.toggleSearchParam({
                  type: e.detail.toLowerCase()
                });
              }}
            />
          </span>
          <span class="px-2">
            <Divider />
          </span>
          <div class="flex flex-col gap-3 p-4">
            <SwitchInput
              label={{ label: "Starred", orientation: Orientation.Horizontal }}
              size={Size.sm}
              isExpanded={true}
              bind:checked={isStarFilterSelected}
              on:change={refresh}
            />
            <SwitchInput
              label={{ label: "Archived", orientation: Orientation.Horizontal }}
              size={Size.sm}
              isExpanded={true}
              bind:checked={isArchivedFilterSelected}
              on:change={refresh}
            />
          </div>
        </div>
      {/if}
      <div
        class={cn("flex flex-col gap-8 w-full", {
          "grow px-5": variant === "v1",
          "flex-grow": variant === "v2" || variant === "v3"
        })}
      >
        {#if variant === "v2"}
          <LibrarySearchBox
            {variant}
            {resources}
            bind:selectedResource
            bind:searchQuery
            on:keydown={refresh}
            {searchStore}
          />
        {/if}
        {#if isRefreshing}
          <LibraryLoadingPulse />
        {:else if data && data.length > 0}
          <div
            class={cn("flex flex-col grow", {
              "px--5": variant === "v2"
            })}
          >
            <!-- TODO - pagination -->
            <Resources
              data={data.slice(0, 500)}
              accessPoint={ResourceAccessPoint.LIBRARY}
              resource={selectedResource}
              arrangement={!$view.isConstrainedWidth
                ? Arrangement.GRID
                : Arrangement.LIST}
            />
          </div>
          <div class="flex w-full justify-center text-b2 text-fgs3">
            {resolveFooterMessage(data) ?? ""}
          </div>
          <ScrollViewBottomSpacer />
        {:else if availableResources.includes(selectedResource)}
          <EmptyStatusView
            size={Size.lg}
            {...resolveEmptyStateMessage()}
            isSearchContext={true}
            actionText={selectedResource === Resource.node
              ? "Install chrome extension"
              : undefined}
            on:click={() => {
              appStore.openLink(
                $appStore.appData?.urls?.chromeExtension ??
                  "https://memotron.io"
              );
            }}
          />
        {:else}
          <!-- <EmptyStatusView
            mainText="Coming soon..."
            subText="We are super thrilled to work with you on this feature. Stay tuned."
          /> -->
          <ComingSoonView
            mainText="Coming soon..."
            subText="We are super thrilled to work with you on this feature. Stay tuned."
          />
        {/if}
      </div>
    </main>
  </div>
  {#if $multiSelectStore.length > 0}
    <BottomFloat>
      <BulkEditBar
        context={multiSelectContext}
        on:selectAll={onSelectAll}
        on:archive={() => onBulkAction("archive")}
        on:delete={() => onBulkAction("delete")}
        on:star={() => onBulkAction("star")}
      />
    </BottomFloat>
  {/if}
</div>

<ComponentBaseLayer
  syncDownOnMount={true}
  subscribeTo={availableResources}
  on:syncDown={refresh}
  on:change={onResourceMutation}
/>

<style>
  input::placeholder {
    font-weight: lighter;
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
