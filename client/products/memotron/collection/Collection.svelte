<script lang="ts">
  import {
    resolveActiveCollectionStore,
    type IActiveCollectionStore
  } from "./collection.store";
  import Cover from "./Cover.svelte";
  import CollectionTitleBar from "./CollectionTitleBar.svelte";
  import View from "./View.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import ViewSettingsBar from "./ViewSettingsBar.svelte";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import ViewTabSwitcher from "./ViewTabSwitcher.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import {
    NodeThumbnailVariant,
    type INodeThumbnail
  } from "$lib/client/products/memotron/node/node.type";
  import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { onMount } from "svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import ModalCloseButton from "$lib/client/elements/button/ModalCloseButton.svelte";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import { isValidString } from "$lib/shared/utils/text.utils";

  import { metaPropertyOptions } from "./properties/property.store";
  import type { ICollectionViewWithData } from "$lib/client/products/memotron/collection/collection.type";
  import ResourceStatusBanner from "../common/ResourceStatusBanner.svelte";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import view from "$lib/client/stores/view.store";
  export let id: string = "";
  let collection: IActiveCollectionStore = resolveActiveCollectionStore(
    id
  ) as IActiveCollectionStore;
  let activeView: ICollectionViewWithData | null = null;
  let filteredViewData: INodeThumbnail[] = [];
  let selectedViewId: string;
  let selectedTab: ISelectValue | undefined = undefined;
  let isRoundedExperimental = false;
  let isStickied = false;
  let triggerItemEdit = "";
  let viewRightButtonOptions: { size: Size.xs; style: ButtonStyle } = {
    style: ButtonStyle.OUTLINED,
    size: Size.xs
  };
  let properties: DropdownItem[];
  let viewsForSwitcher: ISelectItem[];
  let isRefreshing = true;
  let isNotInlineAccess: boolean = false;
  $: console.log({ activeView });
  function resolvePropertyList(type: any) {
    //TODO -  map type.properties to dropdown items - mapping corresponding icons from propertyOptions
    const noneOption = {
      label: "None",
      value: "none",
      icon: "none"
    };
    return type
      ? [
          noneOption,
          ...(type?.properties
            ? type.properties.map((x: IProperty) => {
                return { label: x.label, value: x.id };
              })
            : []),
          ...metaPropertyOptions
        ]
      : [noneOption, ...metaPropertyOptions];
  }
  const sampleViews = ["Everything", "This year", "Favorites", "USA"];
  function onViewRemove(e: CustomEvent) {
    if (e.detail) collection.deleteView(e.detail);
    refreshViewsOnSwitcher();
  }
  async function onViewAdd(e: CustomEvent) {
    const id = await collection.createView();
    selectedViewId = id;
    refreshViewsOnSwitcher();
    onViewSwitch();
    triggerItemEdit = id;
  }
  function onViewSettingsChange() {
    if (activeView) collection.updateView(activeView);
  }
  function onArrangementChange(e: MouseEvent) {
    // console.log("onArrangementChange", e.detail);
    if (!activeView) return;
    const currentArrangement = activeView?.arrangement;
    if (currentArrangement === Arrangement.GRID) {
      activeView.arrangement = Arrangement.LIST;
    } else {
      activeView.arrangement = Arrangement.GRID;
    }
    collection.updateView(activeView);
  }
  function onScroll() {
    var elementTarget = document.querySelector(".sticky");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    isStickied = positionFromTop ? positionFromTop <= 0 : false;
  }
  async function onViewSwitch() {
    const view = loadActiveView();
    if (!view) return;
    appStore.toggleSearchParam("view", view.id);
    await refresh();
  }
  function loadActiveView() {
    if (!selectedViewId) return;
    const view =
      $collection.viewsWithData.find((x) => x.id === selectedViewId) ?? null;
    if (!view) return;
    activeView = view;
    return view;
  }
  function onViewLabelChange(e: CustomEvent) {
    console.log("onViewLabelChange", e.detail, activeView);
    if (!activeView) return;
    activeView.label = e.detail.label;
    collection.updateView(activeView);
  }
  function refreshViewsOnSwitcher() {
    viewsForSwitcher = $collection?.viewsWithData
      ? $collection.viewsWithData.filter(activeResourceFilter).map((x) => {
          return { label: x.label ?? "Default", value: x.id };
        })
      : [];
  }
  onMount(async () => {
    // console.log("onMount - collection", { id });
    // collection = resolveActiveCollectionStore(id);
    const viewQueryParam = new URLSearchParams(location.search).get("view");
    const focusParam = new URLSearchParams(location.search).get(
      ResourceAccessMode.FOCUS
    );
    const splitParam = new URLSearchParams(location.search).get(
      ResourceAccessMode.SPLIT
    );
    isNotInlineAccess =
      focusParam === collection.id || splitParam === collection.id
        ? true
        : false;
    if (viewQueryParam) {
      selectedViewId = viewQueryParam;
    }
    await collection.init(selectedViewId);
    loadActiveView();
    if (!activeView) {
      activeView = $collection?.viewsWithData
        ? $collection.viewsWithData.filter(activeResourceFilter)?.[0]
        : null;
      selectedViewId = activeView?.id ?? "";
    }
    properties = resolvePropertyList($collection);
    refreshViewsOnSwitcher();
    await refresh();
    isRefreshing = false;
  });
  async function refresh() {
    if (!activeView) return;
    const tabBy = activeView.tabBy;
    if (!activeView.data || activeView.data.length === 0) {
      await collection.refreshViewData(activeView.id);
      loadActiveView();
    }
    if (!tabBy || (tabBy && selectedTab === "all")) {
      filteredViewData = activeView.data ?? [];
    } else if (tabBy && selectedTab !== undefined) {
      filteredViewData =
        activeView.data?.filter((x) => {
          return (
            x.properties?.find((p) => p.id === tabBy)?.value === selectedTab
          );
        }) ?? [];
    } else {
      filteredViewData = activeView.data ?? [];
    }
  }
  async function onTabSwitch(e: CustomEvent) {
    console.log("onTabSwitch", selectedTab);
    await refresh();
  }
  function onCoverChange(e: CustomEvent) {
    console.log("onCoverChange", e.detail);
    collection.modify({ cover: e.detail });
  }
  $: console.log({ activeView });
</script>

{#if isRefreshing}
  <PageLoadingPulse />
{:else if $collection}
  <div
    class="relative flex flex-col w-full h-full overflow-auto"
    on:scroll={onScroll}
  >
    <Cover
      bind:src={$collection.cover}
      {isRoundedExperimental}
      on:change={onCoverChange}
    />
    <div class={cn("flex flex-col gap-6 pt-4 grow w-full")}>
      <div class="px-4">
        <CollectionTitleBar on:back {collection} />
      </div>
      <header
        class={cn("sticky top-0 z-10 flex flex-col gap-6 bg-bgs1 w-full", {
          "pt-4": isStickied
        })}
      >
        <PanelSwitcher
          items={viewsForSwitcher}
          isEnableAnimationForTitle={true}
          style={PanelSwitcherStyle.BAR}
          title={isStickied ? $collection.label : ""}
          isExpandToFullWidth={true}
          barStyle={BarStyle.EXACT}
          isInEditMode={$isInEditMode}
          bind:triggerItemEdit
          on:remove={onViewRemove}
          on:add={onViewAdd}
          bind:value={selectedViewId}
          on:switch={onViewSwitch}
          on:change={onViewLabelChange}
        >
          <span class="flex gap-2" slot="right">
            <Button
              icon="adjustments-horizontal"
              label="filters"
              {...viewRightButtonOptions}
            />
            <Button
              icon="bars-center-left"
              label="sort"
              {...viewRightButtonOptions}
            />
            <Button
              icon={activeView?.arrangement === Arrangement.GRID
                ? "widget"
                : "list"}
              label={activeView?.arrangement === Arrangement.GRID
                ? "Grid"
                : "List"}
              {...viewRightButtonOptions}
              on:click={onArrangementChange}
            />
          </span>
        </PanelSwitcher>
        {#if activeView && ($isInEditMode || isValidString(activeView.tabBy))}
          <div class="px-4 pb-4 flex flex-col gap-6">
            {#if $isInEditMode}
              <ViewSettingsBar
                bind:view={activeView}
                {properties}
                on:select={onViewSettingsChange}
              />
            {/if}
            {#if activeView.tabBy}
              <ViewTabSwitcher
                view={activeView}
                bind:value={selectedTab}
                properties={$collection?.properties}
                on:select={onTabSwitch}
              />
            {/if}
          </div>
        {/if}
      </header>
      <main
        class={cn(
          "w-full grow flex flex-col gap-2 justify-center items-center px-4",
          {}
        )}
      >
        <ResourceStatusBanner resource={collection} />
        {#if $collection.isRefreshing}
          <PageLoadingPulse />
        {:else if !$collection.isRefreshing && activeView}
          <View
            view={activeView}
            data={filteredViewData}
            isBoardOverflow={isStickied}
            properties={$collection?.properties}
          />
        {:else}
          content
        {/if}
      </main>
    </div>
    {#if isNotInlineAccess}
      <ModalCloseButton path="collection" />
    {/if}
  </div>
{/if}
