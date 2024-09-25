<script lang="ts">
  import {
    resolveActiveCollectionStore,
    type IActiveCollectionStore
  } from "./collection.store";
  import Cover from "./Cover.svelte";
  import CollectionTitleBar from "./CollectionTitleBar.svelte";
  import View from "./View.svelte";
  import { appStore } from "$lib/client/stores/app.store";
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
  import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";
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
  import {
    Arrangement,
    Orientation,
    Placement
  } from "$lib/client/types/direction.enum";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import CoverPicker from "$lib/client/elements/coverPicker/CoverPicker.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import PageLayer from "$lib/client/layout/layers/PageLayer.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  export let id: string = "";
  let collection: IActiveCollectionStore = resolveActiveCollectionStore(
    id
  ) as IActiveCollectionStore;
  let activeView: ICollectionViewWithData | null = null;
  let filteredViewData: INodeThumb[] = [];
  let selectedViewId: string;
  let selectedTab: ISelectValue | undefined = undefined;
  let dev_isRoundedCover = false;
  let isStickied = false;
  let triggerItemEdit = "";
  let viewRightButtonOptions: {
    size: Size.sm;
    style: ButtonStyle;
    isPreventMinWidth: boolean;
  } = {
    style: ButtonStyle.PLAIN,
    size: Size.sm,
    isPreventMinWidth: true
  };
  let properties: DropdownItem[];
  let viewsForSwitcher: ISelectItem[];
  let isReady = false;
  let isNotInlineAccess: boolean = false;
  let selectedArrangement: Arrangement = Arrangement.LIST;
  let isCoverPickerOpen = false;
  let isInEditMode = false;
  let isShowMetaViews = false;
  let isNonViewLaneMode = true;

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
      selectedViewId = activeView?.id?.toString() ?? "";
    }
    properties = await resolvePropertyList();
    refreshViewsLane();
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
                return { label: x.label, value: x.id?.toString() };
              })
            : []),
          ...metaPropertyOptions
        ]
      : [noneOption, ...metaPropertyOptions];
  }

  function onViewRemove(e: CustomEvent) {
    if (e.detail) collection.deleteView(e.detail);
    refreshViewsLane();
  }

  async function onViewAdd(e: CustomEvent) {
    const id = await collection.createView();
    if (!id) return;
    selectedViewId = id.toString();
    refreshViewsLane();
    onViewSwitch();
    triggerItemEdit = id.toString();
  }

  function onViewSettingsChange() {
    if (activeView)
      collection.updateView(activeView.id, activeView, "settings");
  }

  function onArrangementChange(e: CustomEvent) {
    // console.log("onArrangementChange", e.detail);
    if (!activeView) return;
    activeView.arrangement = e.detail;
    collection.updateView(
      activeView.id,
      {
        arrangement: activeView.arrangement
      },
      "arrangement"
    );
  }

  function onScroll() {
    console.log("onScroll");
    var elementTarget = document.querySelector(".stickyheader");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    isStickied = positionFromTop ? positionFromTop <= 0 : false;
  }

  async function onViewSwitch() {
    logger.log({ at: "onViewSwitch", selectedViewId });
    const view = loadActiveView();
    if (!view) return;
    appStore.toggleSearchParam("view", view.id?.toString());
    await refresh({ isNewView: true });
  }

  function onViewLabelChange(e: CustomEvent) {
    if (!e.detail.value || !e.detail.label) return;
    collection.updateView(e.detail.value, { label: e.detail.label }, "label");
  }

  function onViewRearrange(e: CustomEvent) {
    if (e.detail && isValidArrayWithData(e.detail)) {
      collection.modify(
        { views: e.detail },
        { isPreventBackPropagation: true }
      );
    }
  }

  function refreshViewsLane() {
    viewsForSwitcher = $collection?.views
      ? $collection.views.filter(activeResourceFilter).map((x) => {
          return { label: x.label ?? "Default", value: x.id?.toString() };
        })
      : [];
    isNonViewLaneMode = $collection?.views?.length === 1;
  }

  function loadActiveView() {
    logger.log({ at: "loadActiveView", selectedViewId });
    if (!selectedViewId) return;
    const view =
      $collection.views.find((x) => x.id.toString() === selectedViewId) ?? null;
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
    logger.log({ at: "refresh", activeView });
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
    // console.log("onTabSwitch", selectedTab);
    await refresh();
  }
  function onCoverChange(e: CustomEvent) {
    collection.debouncedModify({ cover: e.detail }, "cover");
  }
  function onPlacementChange(e: CustomEvent) {
    logger.log({ at: "onPlacementChange", e });
    collection.debouncedModify(
      {
        coverLayout: {
          ...$collection.coverLayout,
          placement: e.detail
        }
      },
      "coverPlacement"
    );
  }
  function onCoverReposition(e: CustomEvent) {
    logger.log({ at: "onCoverReposition", e });
    const isY =
      $collection.coverLayout?.placement === Placement.Top ||
      !$collection.coverLayout?.placement;
    collection.debouncedModify(
      {
        coverLayout: {
          ...$collection.coverLayout,
          position: isY
            ? { y: e.detail, x: $collection.coverLayout?.position?.x }
            : { x: e.detail, y: $collection.coverLayout?.position?.y }
        }
      },
      "coverPosition"
    );
  }

  function onCoverResize(e: CustomEvent) {
    logger.log({ at: "onCoverResize", e });
    const isY =
      $collection.coverLayout?.placement === Placement.Top ||
      !$collection.coverLayout?.placement;
    collection.debouncedModify(
      {
        coverLayout: {
          ...$collection.coverLayout,
          size: isY
            ? {
                height: e.detail.height,
                width: $collection.coverLayout?.size?.width
              }
            : {
                width: e.detail.width,
                height: $collection.coverLayout?.size?.height
              }
        }
      },
      "coverSize"
    );
  }
</script>

{#if !$collection || $collection.isPageLoading || !isReady}
  <div class="w-full h-full p-4">
    <PageLoadingPulse />
  </div>
{:else if $collection}
  <div
    class={cn("relative flex w-full h-full", {
      "flex-col overflow-auto":
        $collection.coverLayout?.placement === Placement.Top ||
        !$collection.coverLayout?.placement
    })}
    on:scroll={onScroll}
  >
    {#if $collection.coverLayout?.placement !== Placement.Right}
      <Cover
        cover={$collection.cover}
        {isInEditMode}
        placement={$collection.coverLayout?.placement}
        position={$collection.coverLayout?.position}
        size={$collection.coverLayout?.size}
        {dev_isRoundedCover}
        bind:isCoverPickerOpen
        on:change={onCoverChange}
        on:placement={onPlacementChange}
        on:reposition={onCoverReposition}
        on:resize={onCoverResize}
      />
    {/if}
    {#if isCoverPickerOpen}
      <div
        class={cn("flex-1 overflow-auto", {
          "w-full":
            $collection.coverLayout?.placement === Placement.Top ||
            !$collection.coverLayout?.placement,
          "h-full": $collection.coverLayout?.placement === Placement.Right
        })}
      >
        <CoverPicker
          value={$collection.cover}
          on:select={onCoverChange}
          orientation={$collection.coverLayout?.placement === Placement.Top ||
          !$collection.coverLayout?.placement
            ? Orientation.Horizontal
            : Orientation.Vertical}
          on:close={() => (isCoverPickerOpen = false)}
        />
      </div>
    {:else}
      <div
        class={cn("flex flex-col gap-8 flex-1", {
          "h-full overflow-auto":
            $collection.coverLayout?.placement === Placement.Left ||
            $collection.coverLayout?.placement === Placement.Right,
          "w-full": $collection.coverLayout?.placement === Placement.Top
        })}
        on:scroll={onScroll}
      >
        <div class="px-4 pt-6 stickyheader">
          <CollectionTitleBar
            on:back
            {collection}
            bind:isInEditMode
            bind:isShowMetaViews
          />
        </div>
        {#if isShowMetaViews}
          <div class="px-4">
            <OptionSelector
              size={Size.sm}
              selected={""}
              options={[
                {
                  value: "birdView",
                  icon: "ph:bird-light",
                  label: "Bird view"
                },
                {
                  value: "flashcards",
                  icon: "ph:cards-three-light",
                  label: "Run Flashcards"
                },
                {
                  value: "slideshow",
                  icon: "ph:slideshow-light",
                  label: "Start slideshow"
                },
                {
                  value: "timemachine",
                  icon: "ph:clock-counter-clockwise-light",
                  label: "Time machine"
                }
              ]}
            />
          </div>
        {/if}
        {#if (activeView && isValidString(activeView.tabBy)) || isInEditMode || !isNonViewLaneMode}
          <header
            class={cn("sticky top-0 z-10 flex flex-col gap-6 bg-bgs1 w-full", {
              "pt-4": isStickied
            })}
          >
            {#if !isNonViewLaneMode || isInEditMode}
              <PanelSwitcher
                items={viewsForSwitcher}
                isEnableAnimationForTitle={true}
                style={PanelSwitcherStyle.BAR}
                title={isStickied ? $collection.label : ""}
                isExpandToFullWidth={true}
                barStyle={BarStyle.EXACT}
                {isInEditMode}
                bind:triggerItemEdit
                on:remove={onViewRemove}
                on:add={onViewAdd}
                bind:value={selectedViewId}
                on:switch={onViewSwitch}
                on:change={onViewLabelChange}
                on:rearrange={onViewRearrange}
              >
                <span class="flex gap-6" slot="right">
                  {#if !isInEditMode}
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
                      style={InputStyle.PLAIN}
                      isDisableSearch={true}
                      size={Size.sm}
                    />
                  {/if}
                </span>
              </PanelSwitcher>
            {/if}
            {#if activeView && (isInEditMode || isValidString(activeView.tabBy))}
              <div class="px-4 pb-4 flex flex-col gap-6">
                {#if isInEditMode}
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
        {/if}
        <main
          class={cn(
            "w-full grow flex flex-col gap-2 justify-center items-center px-4",
            {
              "overflow-auto": isNonViewLaneMode
            }
          )}
        >
          <ResourceStatusBanner resource={collection} />
          {#if $collection.isViewDataLoading}
            <PageLoadingPulse />
          {:else if !$collection.isViewDataLoading && activeView}
            <View
              view={activeView}
              {isInEditMode}
              data={filteredViewData}
              isBoardOverflow={isStickied}
              properties={$collection?.properties}
            />
          {:else}
            content
          {/if}
        </main>
      </div>
    {/if}
    {#if $collection.coverLayout?.placement === Placement.Right}
      <Cover
        cover={$collection.cover}
        {isInEditMode}
        placement={$collection.coverLayout?.placement}
        position={$collection.coverLayout?.position}
        size={$collection.coverLayout?.size}
        {dev_isRoundedCover}
        bind:isCoverPickerOpen
        on:change={onCoverChange}
        on:placement={onPlacementChange}
        on:reposition={onCoverReposition}
        on:resize={onCoverResize}
      />
    {/if}
    {#if isNotInlineAccess}
      <ModalCloseButton path="collection" />
    {/if}
  </div>
{/if}
<PageLayer isDragAndDropPage={true} />
