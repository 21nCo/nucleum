<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import Resources from "../common/Resources.svelte";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ResourceSwitcher from "$lib/client/elements/switcher/resourceSwitcher/ResourceSwitcher.svelte";
  import type { IResourceSwitchItem } from "$lib/client/types/select.type";
  import { appMenuStore } from "$lib/client/layout/leftPanel/appMenu.store";
  import { appStore } from "$lib/client/stores/app.store";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { resourceAction } from "$lib/client/components/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/resourceStores/resource.type";
  import { selectedResources } from "$lib/client/components/resourceStores/resource.store";
  import BulkEditBar from "../common/BulkEditBar.svelte";
  import { collectionStore } from "../collection/collection.store";
  import { SearchStore } from "../memotron.store";
  let searchQuery: string = "";
  let selectedResource: Resource = Resource.everything;
  let isFiltersVisible: boolean = false;
  let isStickied: boolean = false;
  let isSearchFocused: boolean = false;
  let isStarFilterSelected: boolean = false;
  let data: any[] = [];
  let searchStore = new SearchStore();
  let availableResources: Resource[] = [
    Resource.node,
    Resource.collection,
    Resource.file,
    Resource.task
  ];
  const commonResourceProps = {
    isHidePinAction: true
  };
  const resources: IResourceSwitchItem[] = [
    {
      ...commonResourceProps,
      value: Resource.everything,
      icon: "tag"
    },
    {
      ...commonResourceProps,
      label: "Nodes",
      value: Resource.node,
      icon: "node"
    },
    {
      ...commonResourceProps,
      label: "Collections",
      value: Resource.collection,
      icon: "curation",
      isPinned: true
    },
    {
      ...commonResourceProps,
      label: "Combinations",
      value: Resource.combination,
      icon: "rectangle-group"
    },
    {
      ...commonResourceProps,
      label: "Archived",
      value: Resource.archived,
      icon: "archive"
    },
    {
      ...commonResourceProps,
      label: "Files",
      value: Resource.file,
      icon: "folder"
    },
    {
      ...commonResourceProps,
      label: "Tasks",
      value: Resource.task,
      icon: "rocket"
    }
    // {
    //   value: "clips",
    //   icon: "paper-clip"
    // }
  ];
  $: isCurrentResourcePinned = $appMenuStore[$appStore.product]?.user?.includes(
    resourceAction(selectedResource, ResourceActionType.BROWSE)
  );
  $: contextMenu = [
    {
      group: "all",
      items: [
        {
          label: isCurrentResourcePinned
            ? "Unpin from App menu"
            : "Pin to App menu",
          value: "pin",
          icon: isCurrentResourcePinned ? "unpin" : "pin",
          callback: () => {
            if (!isCurrentResourcePinned)
              appMenuStore.addUserMenuItem(
                resourceAction(selectedResource, ResourceActionType.BROWSE)
              );
            else
              appMenuStore.removeUserMenuItem(
                resourceAction(selectedResource, ResourceActionType.BROWSE)
              );
          }
        },
        {
          label: "Create new",
          value: "create",
          icon: "plus",
          callback: () => {
            appStore.runAction(
              resourceAction(selectedResource, ResourceActionType.CREATE)
            );
          }
        }
      ]
    },
    {
      group: "more",
      items: [
        {
          label: "Show archived",
          value: "archived",
          icon: "archive",
          callback: () => {}
        }
      ]
    }
  ];
  onMount(async () => {
    await refresh();
  });
  async function refresh() {
    data = await searchStore.refresh({
      resource: selectedResource,
      searchQuery,
      isStarFilterSelected
    });
  }
  function onKeydown(event: any) {
    console.log({ event });
    refresh();
  }

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
    else if (selectedResource === Resource.archived) label = "archived item";
    else label = selectedResource;
    return label + (data.length > 1 || isPlural ? "s" : "");
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
    else
      return {
        mainText: `Looks like you don't have any ${label} yet.`,
        subText: `Please create one.`
      };
  }
  function onSelectAll() {
    $selectedResources = data.map((x) => x.id);
  }
  async function onBulkAction(action: string) {
    if (selectedResource === Resource.everything) return;
    if (selectedResource === Resource.node) return;
    if (selectedResource === Resource.collection) {
      if (action === "archive") {
        await collectionStore.bulkModify($selectedResources, {
          isArchived: true
        });
      } else if (action === "delete") {
        await collectionStore.bulkTrash($selectedResources);
      } else if (action === "star") {
        await collectionStore.bulkModify($selectedResources, {
          isStarred: true
        });
      }
    }
    $selectedResources = [];
    await refresh();
  }
</script>

<div class="relative w-full h-full">
  <div
    class={cn("relative w-full h-full flex flex-col overflow-auto", {})}
    on:scroll={onScroll}
  >
    <div class="flex flex-col bg-bgs1 sticky top-0 z-20 shadow--sm">
      <div class="flex w-full justify-between px-5 py-3 pt-6">
        <input
          class="text-h2 w-full bg-transparent focus:outline-none focus:border-none"
          type="text"
          bind:value={searchQuery}
          on:keydown={onKeydown}
          on:focus={() => (isSearchFocused = true)}
          on:blur={() => (isSearchFocused = false)}
          placeholder="Search library"
        />
        <div class="flex items-center gap-2">
          {#if isStickied}
            <DropDown bind:value={selectedResource} items={resources} />
          {/if}
          {#if isFiltersVisible}
            <SwitchInput
              label={{ label: "Starred", orientation: Orientation.Horizontal }}
              size={Size.sm}
              style={InputStyle.BORDERED}
              bind:checked={isStarFilterSelected}
              on:change={refresh}
            />
            <Button
              icon="funnel"
              style={ButtonStyle.OUTLINED}
              size={Size.sm}
              label="Filters"
            />
            <Button
              icon="bars-center-left"
              style={ButtonStyle.OUTLINED}
              size={Size.sm}
              label="Sort"
            />
          {/if}
          <Toggle icon="adjustments-vertical" bind:on={isFiltersVisible} />
        </div>
      </div>
      <Divider
        colorStrength={isSearchFocused
          ? ColorStrength.ExtraStrong
          : ColorStrength.Normal}
      />
    </div>
    <div
      class="flex w-full justify-between items-center px-5 resource-switcher sticky-disabled bg-bgs1 py-5 top-0 z-10"
    >
      <span class="flex w-10/12 overflow-auto">
        <ResourceSwitcher
          options={resources}
          bind:selected={selectedResource}
          on:select={refresh}
          size={Size.sm}
        />
      </span>
      <span>
        <!-- <SwitchInput
        label={{ label: "Starred", orientation: Orientation.Horizontal }}
        size={Size.sm}
        bind:checked={isStarFilterSelected}
        on:change={refresh}
      /> -->
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
              style={ButtonStyle.DEFAULT}
              label={selectedResource}
              isPreventMinWidth={true}
              on:click={() =>
                appStore.runAction(
                  resourceAction(selectedResource, ResourceActionType.CREATE)
                )}
            />
            <ContextMenuAction {contextMenu} size={Size.lg} />
          {/if}
        </span>
      </span>
    </div>
    <main class="flex flex-col gap-8 w-full grow px-5">
      {#if data.length > 0}
        <div class="flex flex-col grow">
          <Resources
            {data}
            accessPoint={ResourceAccessPoint.LIBRARY}
            resource={selectedResource}
            arrangement={Arrangement.GRID}
          />
        </div>
        <div class="flex w-full justify-center text-b2 text-fgs3">
          {resolveFooterMessage(data) ?? ""}
        </div>
        <ScrollViewBottomSpacer />
      {:else if availableResources.includes(selectedResource)}
        <EmptyStatusView {...resolveEmptyStateMessage()} />
      {:else}
        <EmptyStatusView
          mainText="Coming soon..."
          subText="We are super thrilled to work with you on this feature. Stay tuned."
        />
      {/if}
    </main>
  </div>
  {#if $selectedResources.length > 0}
    <BottomFloat>
      <BulkEditBar
        on:selectAll={onSelectAll}
        on:archive={() => onBulkAction("archive")}
        on:delete={() => onBulkAction("delete")}
        on:star={() => onBulkAction("star")}
      />
    </BottomFloat>
  {/if}
</div>

<style>
  input::placeholder {
    font-weight: lighter;
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
