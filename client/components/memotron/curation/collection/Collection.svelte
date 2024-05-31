<script lang="ts">
  import {
    CurationType,
    type ICollectionView
  } from "$lib/client/types/memotron/curation.type";
  import {
    resolveActiveCollectionStore,
    type IActiveCollectionStore
  } from "../curation.store";
  import Cover from "./Cover.svelte";
  import CollectionTitleBar from "./CollectionTitleBar.svelte";
  import View from "./View.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import ViewSettingsBar from "./ViewSettingsBar.svelte";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import { metaPropertyOptions, propertyOptions } from "../../type/type.store";
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
  import { NodeThumbnailVariant } from "$lib/client/types/memotron/node.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { toggleSearchParam } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type { SelectItem } from "$lib/client/types/select.type";
  import ModalCloseButton from "$lib/client/elements/button/ModalCloseButton.svelte";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  export let id: string;
  let activeView: ICollectionView | null = null;
  let selectedViewId: string;
  let selectedTab: string;
  let isRoundedExperimental = false;
  let isStickied = false;
  let triggerItemEdit = "";
  let viewRightButtonOptions = {
    style: ButtonStyle.OUTLINED,
    size: Size.xs
  };
  let collection: IActiveCollectionStore;
  let properties: DropdownItem[];
  let viewsForSwitcher: SelectItem[];
  let isRefreshing = true;
  let isNotInlineAccess: boolean = false;
  // $: console.log({ activeView, views });
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
    if (currentArrangement === NodeThumbnailVariant.GRID) {
      activeView.arrangement = NodeThumbnailVariant.LIST;
    } else {
      activeView.arrangement = NodeThumbnailVariant.GRID;
    }
    collection.updateView(activeView);
  }
  function onScroll() {
    var elementTarget = document.querySelector(".sticky");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    isStickied = positionFromTop ? positionFromTop <= 0 : false;
  }
  async function onViewSwitch() {
    const view = setActiveView();
    if (!view) return;
    toggleSearchParam("view", view.id);
    await collection.refreshViewData(view.id);
  }
  function setActiveView() {
    if (!selectedViewId) return;
    const view = $collection.views.find((x) => x.id === selectedViewId) ?? null;
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
    viewsForSwitcher =
      $collection && "views" in $collection
        ? $collection.views.filter(activeResourceFilter).map((x) => {
            return { label: x.label ?? "Default", value: x.id };
          })
        : [];
  }
  onMount(async () => {
    // console.log("onMount - collection", { id });
    collection = resolveActiveCollectionStore(id);
    const viewQueryParam = new URLSearchParams(location.search).get("view");
    const focusParam = new URLSearchParams(location.search).get(
      ResourceAccessMode.FOCUS
    );
    const splitParam = new URLSearchParams(location.search).get(
      ResourceAccessMode.SPLIT
    );
    isNotInlineAccess = focusParam === id || splitParam === id ? true : false;
    if (viewQueryParam) {
      selectedViewId = viewQueryParam;
    }
    await collection.init(id, selectedViewId);
    setActiveView();
    if (!activeView) {
      activeView =
        $collection && "views" in $collection
          ? $collection.views.filter(activeResourceFilter)?.[0]
          : null;
      selectedViewId = activeView?.id ?? "";
    }
    properties = resolvePropertyList($collection?.associatedType);
    refreshViewsOnSwitcher();
    isRefreshing = false;
  });
</script>

{#if isRefreshing}
  <PageLoadingPulse />
{:else if $collection}
  <div
    class="relative flex flex-col gap-4 w-full h-full overflow-auto"
    on:scroll={onScroll}
  >
    {#if $collection.type != CurationType.NODELINKS && "cover" in $collection}
      <Cover bind:src={$collection.cover} {isRoundedExperimental} />
    {/if}
    <div class={cn("flex flex-col gap-6 grow w-full")}>
      <div class="px-4">
        <CollectionTitleBar on:back {id} />
      </div>
      <header
        class={cn("sticky top-0 flex flex-col gap-6 bg-bgs1 w-full", {
          "pt-4": isStickied
        })}
      >
        <PanelSwitcher
          items={viewsForSwitcher}
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
              icon={activeView?.arrangement === NodeThumbnailVariant.GRID
                ? "widget"
                : "list"}
              label={activeView?.arrangement === NodeThumbnailVariant.GRID
                ? "Grid"
                : "List"}
              {...viewRightButtonOptions}
              on:click={onArrangementChange}
            />
          </span>
        </PanelSwitcher>
        {#if activeView}
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
                properties={$collection?.associatedType?.properties}
              />
            {/if}
          </div>
        {/if}
      </header>
      <main class={cn("w-full grow flex justify-center items-center px-4", {})}>
        {#if $collection.isRefreshing}
          <PageLoadingPulse />
        {:else if !$collection.isRefreshing && activeView}
          <View
            view={activeView}
            properties={$collection?.associatedType?.properties}
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
