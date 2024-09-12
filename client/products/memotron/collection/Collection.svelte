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
  import type { INodeThumbnail } from "$lib/client/products/memotron/node/node.type";
  import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { onMount } from "svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import ModalCloseButton from "$lib/client/elements/button/ModalCloseButton.svelte";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { isValidString } from "$lib/shared/utils/text.utils";

  import { metaPropertyOptions } from "./properties/property.store";
  import type { ICollectionViewWithData } from "$lib/client/products/memotron/collection/collection.type";
  import ResourceStatusBanner from "../common/ResourceStatusBanner.svelte";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
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
  let viewRightButtonOptions: {
    size: Size.sm;
    style: ButtonStyle;
    isPreventMinWidth: boolean;
  } = {
    style: ButtonStyle.OUTLINED,
    size: Size.sm,
    isPreventMinWidth: true
  };
  let properties: DropdownItem[];
  let viewsForSwitcher: ISelectItem[];
  let isReady = false;
  let isNotInlineAccess: boolean = false;
  let selectedArrangement: Arrangement = Arrangement.LIST;

  onMount(async () => {
    // console.log("onMount - collection", { id });
    const viewQueryParam = new URLSearchParams(location.search).get("view");
    const focusParam = new URLSearchParams(location.search).get(
      ResourceAccessMode.FULL
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
    await collection.init();
    loadActiveView();
    if (!activeView) {
      activeView = $collection?.views
        ? $collection.views.filter(activeResourceFilter)?.[0]
        : null;
      selectedViewId = activeView?.id ?? "";
    }
    properties = await resolvePropertyList();
    refreshViewsOnSwitcher();
    isReady = true;
    await refresh({ isNewView: true });
  });

  async function resolvePropertyList() {
    //TODO -  map type.properties to dropdown items - mapping corresponding icons from propertyOptions
    const noneOption = {
      label: "None",
      value: "none",
      icon: "none"
    };
    return $collection?.properties
      ? [
          noneOption,
          ...($collection?.properties
            ? $collection?.properties.map((x: IProperty) => {
                return { label: x.label, value: x.id };
              })
            : []),
          ...metaPropertyOptions
        ]
      : [noneOption, ...metaPropertyOptions];
  }

  function onViewRemove(e: CustomEvent) {
    if (e.detail) collection.deleteView(e.detail);
    refreshViewsOnSwitcher();
  }

  async function onViewAdd(e: CustomEvent) {
    const id = await collection.createView();
    if (!id) return;
    selectedViewId = id;
    refreshViewsOnSwitcher();
    onViewSwitch();
    triggerItemEdit = id;
  }

  function onViewSettingsChange() {
    if (activeView) collection.updateView(activeView.id, activeView);
  }

  function onArrangementChange(e: CustomEvent) {
    // console.log("onArrangementChange", e.detail);
    if (!activeView) return;
    activeView.arrangement = e.detail;
    collection.updateView(activeView.id, {
      arrangement: activeView.arrangement
    });
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
    await refresh({ isNewView: true });
  }

  function onViewLabelChange(e: CustomEvent) {
    console.log("onViewLabelChange", e.detail, activeView);
    if (!activeView) return;
    activeView.label = e.detail.label;
    collection.updateView(activeView.id, { label: activeView.label });
  }

  function refreshViewsOnSwitcher() {
    viewsForSwitcher = $collection?.views
      ? $collection.views.filter(activeResourceFilter).map((x) => {
          return { label: x.label ?? "Default", value: x.id };
        })
      : [];
  }

  function loadActiveView() {
    logger.debug({ at: "loadActiveView", selectedViewId });
    if (!selectedViewId) return;
    const view = $collection.views.find((x) => x.id === selectedViewId) ?? null;
    if (!view) return;
    activeView = view;
    selectedArrangement = view.arrangement ?? selectedArrangement;
    return view;
  }

  async function refresh(
    props: { isNewView?: boolean } = {
      isNewView: false
    }
  ) {
    if (!activeView) return;
    const tabBy = activeView.tabBy;
    logger.debug({ at: "refresh", activeView });
    if (props.isNewView) await collection.loadViewData(activeView.id);
    else await collection.refreshViewData(activeView.id);
    loadActiveView();
    if (!activeView) return;
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
  $: console.log({ activeView, collection: $collection, properties });
</script>

{#if !$collection || $collection.isPageLoading || !isReady}
  <div class="w-full h-full p-4">
    <PageLoadingPulse />
  </div>
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
            <!-- <Button
              icon={activeView?.arrangement === Arrangement.GRID
                ? "widget"
                : "list"}
              label={activeView?.arrangement === Arrangement.GRID
                ? "Grid"
                : "List"}
              {...viewRightButtonOptions}
              on:click={onArrangementChange}
            /> -->
            <DropDown
              items={[
                { value: Arrangement.LIST, label: "List" },
                { value: Arrangement.GRID, label: "Grid" },
                {
                  value: Arrangement.MASONRY,
                  label: "Masonry"
                }
              ]}
              bind:value={selectedArrangement}
              on:select={onArrangementChange}
              isDisableSearch={true}
              size={Size.sm}
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
        {#if $collection.isViewDataLoading}
          <PageLoadingPulse />
        {:else if !$collection.isViewDataLoading && activeView}
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
