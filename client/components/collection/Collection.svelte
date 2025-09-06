<script lang="ts">
  import {
    ActiveCollectionStore,
    type IActiveCollectionStore
  } from "./collection.store";
  import Cover from "./Cover.svelte";
  import CollectionTitleBar from "./CollectionTitleBar.svelte";
  import View from "./View.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import ViewSettingsBar from "./ViewSettingsBar.svelte";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import ViewTabSwitcher from "./tabSwitcher/ViewTabSwitcher.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import {
    PropertyType,
    type IProperty
  } from "$lib/client/components/collection/properties/property.type";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { onMount } from "svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type {
    ISelectItem,
    ISelectValue
  } from "$lib/client/types/select.type";
  import FullScreenCloseButton from "$lib/client/elements/button/FullScreenCloseButton.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import {
    CollectionLayout,
    CollectionType,
    type ICollectionItem,
    type ICollectionViewWithData
  } from "$lib/client/components/collection/collection.type";
  import ResourceStatusBanner from "$lib/client/components/record/RecordStatusBanner.svelte";
  import {
    Arrangement,
    Orientation,
    Placement
  } from "$lib/client/types/direction.enum";
  import { logger } from "$lib/client/components/debug/logger.client";
  import CoverPicker from "$lib/client/elements/coverPicker/CoverPicker.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import ArrangementSelector from "./arrangementSelector/ArrangementSelector.svelte";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  import AddResourceAction from "./AddResourceAction.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import {
    isNoneResource,
    resourceAction,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import view from "$lib/client/stores/view.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import {
    resolvePropertyIcon,
    tabAndGroupableProperties
  } from "./properties/property.utils";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import BulkEditBar from "$lib/client/components/record/BulkEditBar.svelte";
  import { BulkEditor } from "$lib/client/components/record/record.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { Action } from "$lib/client/types/action.enum";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { resolveResourceStore } from "../flux/resourceStores/store.resolver";

  export let id: string = "";
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let parentBgIndex: number = 1;

  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;
  let collection: IActiveCollectionStore = ActiveCollectionStore.resolve(id);
  let activeView: ICollectionViewWithData | null = null;
  let viewData: ICollectionItem[] = [];
  let _filtered: ICollectionItem[] = [];
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
  let isCoverPickerOpen = false;
  let isShowMetaViews = false;
  let isSingleViewMode = true;
  let searchQuery: string = "";
  let containerWidth = 0;

  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    $collection?.accessMode === ResourceAccessMode.SPLIT ||
    $collection?.accessMode === ResourceAccessMode.FSPLIT ||
    (containerWidth < 1000 &&
      ($collection?.coverLayout?.placement === Placement.Right ||
        $collection?.coverLayout?.placement === Placement.Left));

  $: coverPlacement =
    $collection?.coverLayout?.placement === Placement.Top ||
    !$collection?.coverLayout?.placement ||
    isConstrainedWidth ||
    $view.isPortrait
      ? Placement.Top
      : $collection?.coverLayout?.placement;

  $: isBoardContext =
    activeView?.layout === CollectionLayout.BOARD &&
    !isNoneResource(activeView?.groupBy);

  $: multiSelectContext = {
    resource: Resource.node,
    accessPoint: ResourceAccessPoint.COLLECTION,
    accessPointId: id
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

  onMount(async () => {
    const viewQueryParam = new URLSearchParams(location.search).get("view");
    if (viewQueryParam) {
      selectedViewId = viewQueryParam;
    }
    await collection.init(accessMode);
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
    const noneOption = {
      label: "None",
      value: "property:none",
      icon: "circle-dashed"
    };
    return $collection?.properties
      ? [
          noneOption,
          ...($collection?.properties
            ? $collection?.properties
                .filter(activeResourceFilter)
                .filter((x) => tabAndGroupableProperties.includes(x.type))
                .map((x: IProperty) => {
                  return {
                    label: x.label,
                    value: x.id?.toString(),
                    icon: resolvePropertyIcon(x)
                  };
                })
            : [])
          // ...metaPropertyOptions
        ]
      : [
          noneOption
          // ...metaPropertyOptions
        ];
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

  function onViewSettingsChange(e: CustomEvent) {
    logger.log({ at: "onViewSettingsChange", activeView, e });
    if (!activeView) return;
    const key = e.detail.key;
    let value = e.detail.value;
    if (!key) return;
    activeView[key] = value;
    collection.updateView(
      activeView.id,
      {
        [key]: value
      },
      "settings"
    );
  }

  function onArrangementChange(e: CustomEvent) {
    if (!activeView) return;
    activeView.arrangement = e.detail;
    activeView.density = activeView.density ? activeView.density : 1;
    collection.updateView(
      activeView.id,
      {
        arrangement: activeView.arrangement,
        density: activeView.density
      },
      "arrangement"
    );
  }

  function onDensityChange(e: CustomEvent) {
    if (!activeView) return;
    activeView.density = e.detail;
    collection.updateView(
      activeView.id,
      {
        density: activeView.density
      },
      "density"
    );
  }

  function onPreviewSettingChange(e: CustomEvent) {
    if (!activeView) return;
    activeView.isHideThumbnailPreview = e.detail;
    collection.updateView(
      activeView.id,
      {
        isHideThumbnailPreview: activeView.isHideThumbnailPreview
      },
      "isHideThumbnailPreview"
    );
  }

  function onTitleSettingChange(e: CustomEvent) {
    if (!activeView) return;
    activeView.isHideThumbnailTitle = e.detail;
    collection.updateView(
      activeView.id,
      {
        isHideThumbnailTitle: activeView.isHideThumbnailTitle
      },
      "isHideThumbnailTitle"
    );
  }

  function onScroll() {
    var elementTarget = document.querySelector(".stickyheader");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    isStickied = positionFromTop ? positionFromTop <= 0 : false;
  }

  async function onViewSwitch() {
    logger.log({ at: "onViewSwitch", selectedViewId });
    resetViewSelections();
    const view = loadActiveView();
    if (!view) return;
    appStore.toggleSearchParam({ [AppSearchParam.VIEW]: view.id?.toString() });
    await refresh({ isNewView: true });
  }

  function resetViewSelections() {
    selectedTab = undefined;
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
    isSingleViewMode = viewsForSwitcher?.length === 1;
  }

  function loadActiveView() {
    logger.log({ at: "loadActiveView", selectedViewId });
    if (!selectedViewId) return;
    const view =
      $collection.views.find((x) => x.id.toString() === selectedViewId) ?? null;
    if (!view) return;
    activeView = view;
    return view;
  }

  async function refresh(
    props: { isNewView?: boolean } = {
      isNewView: false
    }
  ) {
    if (!activeView) return;
    const tabBy = activeView.tabBy;
    const resourceStore = resolveResourceStore(
      $collection.resource ?? Resource.node
    );
    await collection.loadViewData(
      activeView.id,
      resourceStore,
      props.isNewView
    );
    loadActiveView();
    if (!activeView) return;
    logger.log({ at: "refresh", activeView, searchQuery });
    activeView.data = activeView.data.filter(activeResourceFilter);
    if (!tabBy || (tabBy && selectedTab === "all")) {
      viewData = activeView.data ?? [];
    } else if (tabBy && selectedTab !== undefined) {
      viewData =
        activeView.data?.filter((x) => {
          const prop = x.properties?.find(resourceInList(tabBy))?.value;
          return Array.isArray(prop)
            ? prop.includes(selectedTab)
            : prop === selectedTab;
        }) ?? [];
    } else {
      viewData = activeView.data ?? [];
    }
    _filtered = viewData;
  }

  async function onSearch() {
    try {
      logger.log({ at: "onSearch", searchQuery, viewData });
      if (searchQuery) {
        _filtered = viewData.filter((x) => {
          return (
            x.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            x.body
              ?.toString()
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            x.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            x.parent?.label?.toLowerCase()?.includes(searchQuery.toLowerCase())
          );
        });
      } else {
        _filtered = viewData;
      }
    } catch (e) {
      logger.error({ at: "onSearch", error: e });
    }
  }

  async function onTabSwitch(e: CustomEvent) {
    // console.log("onTabSwitch", selectedTab);
    await refresh();
  }

  /**
   * Used only in case of color picker, for other cases, persistCoverChange is used to set the cover and persist. For color picker, the select event is triggered debounced, therefore onCoverChange is used to set the cover without persisting.
   * @param e
   */
  function onCoverChange(e: CustomEvent) {
    $collection.cover = e.detail;
  }

  function persistCoverChange(e: CustomEvent) {
    collection.modify({ cover: e.detail });
  }

  function onPlacementChange(e: CustomEvent) {
    logger.log({ at: "onPlacementChange", e });
    collection.modify({
      coverLayout: {
        ...$collection.coverLayout,
        placement: e.detail
      }
    });
  }

  function onCoverReposition(e: CustomEvent) {
    logger.log({ at: "onCoverReposition", e });
    const result = resolveCoverPosition(e);
    if (result && $collection.isInEditMode) {
      $collection.coverLayout = result;
    }
  }

  function resolveCoverPosition(e: CustomEvent) {
    if (
      (coverPlacement === Placement.Top &&
        $collection.coverLayout?.position?.y === e.detail) ||
      (coverPlacement !== Placement.Top &&
        $collection.coverLayout?.position?.x === e.detail)
    )
      return;
    return {
      ...$collection.coverLayout,
      position:
        coverPlacement === Placement.Top
          ? { y: e.detail, x: $collection.coverLayout?.position?.x }
          : { x: e.detail, y: $collection.coverLayout?.position?.y }
    };
  }

  function onCoverRepositionDebounced(e: CustomEvent) {
    logger.log({ at: "onCoverRepositionDebounced", e });
    if ($collection.isInEditMode) {
      collection.modify({ coverLayout: $collection.coverLayout });
    }
  }

  function onCoverResize(e: CustomEvent) {
    logger.log({ at: "onCoverResize", e });
    $collection.coverLayout = resolveCoverResized(e);
  }

  function resolveCoverResized(e: CustomEvent) {
    return {
      ...$collection.coverLayout,
      size:
        coverPlacement === Placement.Top
          ? {
              height: e.detail.height,
              width: $collection.coverLayout?.size?.width
            }
          : {
              width: e.detail.width,
              height: $collection.coverLayout?.size?.height
            }
    };
  }

  function onCoverResizeDebounced(e: CustomEvent) {
    logger.log({ at: "onCoverResizeDebounced", e });
    collection.modify({ coverLayout: resolveCoverResized(e) });
  }

  function onAddResource(e: CustomEvent) {
    if (e.detail === "addExisting") {
      appStore.runAction(Action.ADD_ITEM_TO_COLLECTION, {
        componentParams: {
          label: `Add to &nbsp; **${$collection.label}**`,
          id: $collection.id,
          resource: $collection.resource
        }
      });
    } else if (e.detail === "createNew" || e.detail === "createMultiple") {
      let params = {};
      if (e.detail === "createMultiple") {
        params = {
          [AppSearchParam.LINK]: $collection.id.toString(),
          [AppSearchParam.BULK]: true
        };
      } else {
        params = {
          [AppSearchParam.LINK]: $collection.id.toString()
        };
      }
      setTimeout(() => {
        const resource = $collection.resource ?? Resource.node;
        appStore.runResourceAction(resource, ResourceActionType.CREATE, {
          searchParams: params
        });
      }, 10);
    }
  }

  function onCaptureShortcutChange(e: CustomEvent) {
    collection.modify({ isCaptureShortcutEnabled: e.detail });
  }

  function onTypeExtensionChange(e: CustomEvent) {
    if (e.detail.id) {
      collection.modify(
        { typeToExtend: e.detail.id },
        { isPreventBackPropagation: true }
      );
    } else if (e.detail === false) {
      collection.modify({ typeToExtend: undefined });
    }
  }

  async function onBulkAction(
    e: CustomEvent<{ action: string; data?: unknown }>
  ) {
    try {
      const editor = new BulkEditor(Resource.node, multiSelectStore);
      const result = await editor.run(e.detail.action, e.detail.data);
      if (result) {
        await refresh();
      }
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }

  function onSelectAll(e: CustomEvent) {
    logger.log({ at: "onSelectAll", e });
  }
</script>

{#if !$collection || $collection.isPageLoading || !isReady}
  <div class="w-full h-full p-4 cw:pt-12">
    <PageLoadingPulse />
  </div>
{:else if $collection}
  <div
    class={cn("relative flex w-full h-full", {
      "flex-col overflow-auto": coverPlacement === Placement.Top,
      "cw:pt-12": !$collection.cover
    })}
    on:scroll={onScroll}
    use:resizeListener={(e) => {
      containerWidth = e.width;
    }}
  >
    {#if accessPoint === ResourceAccessPoint.SELF && coverPlacement !== Placement.Right}
      <Cover
        cover={$collection.cover}
        isInEditMode={$collection.isInEditMode}
        placement={coverPlacement}
        position={$collection.coverLayout?.position}
        size={$collection.coverLayout?.size}
        {dev_isRoundedCover}
        {isConstrainedWidth}
        bind:isCoverPickerOpen
        on:change={onCoverChange}
        on:placement={onPlacementChange}
        on:reposition={onCoverReposition}
        on:repositionDebounced={onCoverRepositionDebounced}
        on:resize={onCoverResize}
        on:resizeDebounced={onCoverResizeDebounced}
      />
    {/if}
    {#if isCoverPickerOpen}
      <div
        class={cn("flex-1 overflow-auto", {
          "w-full": coverPlacement === Placement.Top,
          "h-full": coverPlacement === Placement.Right
        })}
      >
        <CoverPicker
          value={$collection.cover}
          on:change={onCoverChange}
          on:select={persistCoverChange}
          orientation={coverPlacement === Placement.Top
            ? Orientation.Horizontal
            : Orientation.Vertical}
          on:close={() => (isCoverPickerOpen = false)}
        />
      </div>
    {:else}
      <div
        class={cn("flex flex-col flex-1", {
          "mo:gap-4 gap-8": !isSingleViewMode || isShowMetaViews,
          "h-full overflow-auto": coverPlacement !== Placement.Top,
          "w-full": coverPlacement === Placement.Top
        })}
        on:scroll={onScroll}
      >
        {#if $collection.isInEditMode && !isCoverPickerOpen}
          <button
            class="w-full min-h-12 bg-ass1 text-abg flex gap-2 items-center justify-center"
            on:click={() => {
              collection.toggleEditMode(false);
            }}
          >
            <Icon icon="cross" size={Size.sm} class="text-abg" />
            <span> Close edit mode </span>
          </button>
        {/if}
        <div
          class={cn("px-4 stickyheader", {
            "sticky top-0": isSingleViewMode,
            [bg(parentBgIndex - 1)]: isSingleViewMode,
            // When in edit mode, interfering with view settings dropdown when the dropdown opens on top if z-20 is set
            "z-20": isSingleViewMode && !$collection.isInEditMode,
            "pb-8": isSingleViewMode && !isShowMetaViews && !isConstrainedWidth,
            "pt-6": !isConstrainedWidth,
            "p-2": isConstrainedWidth,
            "max-w-full overflow-x-auto":
              accessPoint === ResourceAccessPoint.MARKDOWN_EMBED
          })}
        >
          <CollectionTitleBar
            on:back
            {collection}
            {accessPoint}
            {isSingleViewMode}
            {isConstrainedWidth}
            bind:searchQuery
            bind:isShowMetaViews
            on:search={onSearch}
            on:add={onAddResource}
          >
            <span slot="additional" class="flex items-center gap-2">
              {#if isSingleViewMode && !$collection.isInEditMode}
                <ArrangementSelector
                  {isBoardContext}
                  resource={$collection.resource}
                  arrangement={activeView?.arrangement ?? Arrangement.LIST}
                  density={activeView?.density}
                  isHideThumbnailPreview={activeView?.isHideThumbnailPreview}
                  isHideThumbnailTitle={activeView?.isHideThumbnailTitle}
                  on:arrangementChange={onArrangementChange}
                  on:densityChange={onDensityChange}
                  on:previewSettingChange={onPreviewSettingChange}
                  on:titleSettingChange={onTitleSettingChange}
                />
              {/if}
            </span>
          </CollectionTitleBar>
        </div>
        {#if isConstrainedWidth && !$collection.isInEditMode}
          <div
            class={cn("flex flex-col px-4", {
              "pb-3": isSingleViewMode,
              "-mt-3": !isSingleViewMode
            })}
          >
            <!-- {#if $collection.description}
              <div class="text-fgs3 text-b3 py-2">
                {$collection.description}
              </div>
            {/if} -->
            <div class="flex items-center justify-center">
              <InlineSearchBar
                bind:query={searchQuery}
                style={InputStyle.FILLED}
                on:search={onSearch}
                placeholder={`Search this collection (${$collection.totalItemCount ?? 0} items)`}
              >
                {#if !$collection.isInEditMode}
                  <AddResourceAction on:add={onAddResource} variant="minimal" />
                {/if}
              </InlineSearchBar>
            </div>
          </div>
        {/if}
        {#if isShowMetaViews}
          <div class="px-4">
            <OptionSelector
              size={Size.sm}
              selected={""}
              options={[
                {
                  value: "birdView",
                  icon: "bird",
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
                  icon: "history",
                  label: "Time machine"
                }
              ]}
            />
          </div>
        {/if}
        {#if (activeView && isValidString(activeView.tabBy)) || $collection.isInEditMode || !isSingleViewMode}
          <header
            class={cn(
              "sticky top-0 z-10 flex flex-col gap-6 w-full",
              bg(parentBgIndex - 1),
              {
                "pt-4": isStickied
              }
            )}
          >
            {#if !isSingleViewMode || $collection.isInEditMode}
              <PanelSwitcher
                addText={"Add view"}
                items={viewsForSwitcher}
                isEnableAnimationForTitle={true}
                style={PanelSwitcherStyle.BAR}
                title={isStickied ? $collection.label : ""}
                isExpandToFullWidth={true}
                barStyle={BarStyle.EXACT}
                isInEditMode={$collection.isInEditMode}
                isRenderDropdownForCW={true}
                {parentBgIndex}
                bind:triggerItemEdit
                on:remove={onViewRemove}
                on:add={onViewAdd}
                bind:value={selectedViewId}
                on:switch={onViewSwitch}
                on:change={onViewLabelChange}
                on:rearrange={onViewRearrange}
              >
                <span class="flex items-center gap-4 mo:pr-0 pr-4" slot="right">
                  <!-- <ToggleGroup
                    class="gap-3"
                    items={[
                      {
                        value: "filter",
                        icon: "funnel"
                      },
                      {
                        value: "sort",
                        icon: "ph:arrows-down-up-light"
                      }
                    ]}
                  /> -->
                  <ArrangementSelector
                    {isBoardContext}
                    resource={$collection.resource}
                    arrangement={activeView?.arrangement ?? Arrangement.LIST}
                    density={activeView?.density}
                    isHideThumbnailPreview={activeView?.isHideThumbnailPreview}
                    isHideThumbnailTitle={activeView?.isHideThumbnailTitle}
                    on:arrangementChange={onArrangementChange}
                    on:densityChange={onDensityChange}
                    on:previewSettingChange={onPreviewSettingChange}
                    on:titleSettingChange={onTitleSettingChange}
                  />
                  {#if !$collection.isInEditMode && !isConstrainedWidth}
                    <AddResourceAction
                      variant="strong"
                      on:add={onAddResource}
                    />
                  {/if}
                </span>
              </PanelSwitcher>
            {/if}
            {#if activeView && ($collection.isInEditMode || !isNoneResource(activeView.tabBy))}
              <div class="px-4 pb-4 flex flex-col gap-6">
                {#if $collection.isInEditMode}
                  {#if isConstrainedWidth}
                    <span class="text-fgs3 text-b3">
                      Currently, advanced view editing is only available on
                      Desktop. Sorry for the inconvenience.
                    </span>
                  {:else}
                    <ViewSettingsBar
                      bind:view={activeView}
                      {properties}
                      on:change={onViewSettingsChange}
                    />
                  {/if}
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
          class={cn("w-full grow flex flex-col gap-2 items-center px-4", {
            "overflow-auto": isSingleViewMode
          })}
        >
          <ResourceStatusBanner resource={collection} />
          {#if $collection.isViewDataLoading}
            <PageLoadingPulse />
          {:else if !$collection.isViewDataLoading && activeView}
            <View
              {collection}
              view={activeView}
              data={_filtered}
              isBoardOverflow={isStickied}
            />
          {:else}
            content
          {/if}
        </main>
      </div>
    {/if}
    {#if accessPoint === ResourceAccessPoint.SELF && coverPlacement === Placement.Right}
      <Cover
        cover={$collection.cover}
        isInEditMode={$collection.isInEditMode}
        placement={coverPlacement}
        position={$collection.coverLayout?.position}
        size={$collection.coverLayout?.size}
        {dev_isRoundedCover}
        {isConstrainedWidth}
        bind:isCoverPickerOpen
        on:change={onCoverChange}
        on:placement={onPlacementChange}
        on:reposition={onCoverReposition}
        on:repositionDebounced={onCoverRepositionDebounced}
        on:resize={onCoverResize}
        on:resizeDebounced={onCoverResizeDebounced}
      />
    {/if}
    {#if $collection?.accessMode === ResourceAccessMode.SPLIT || $collection?.accessMode === ResourceAccessMode.FULL || $collection?.accessMode === ResourceAccessMode.FSPLIT}
      <FullScreenCloseButton
        style={ButtonVariant.DANGER}
        accessMode={$collection.accessMode}
      />
    {/if}
  </div>
  {#if $multiSelectStore.length > 0}
    <BottomFloat zIndex="z-30">
      <BulkEditBar
        isExpandedMode={!isConstrainedWidth}
        context={multiSelectContext}
        on:selectAll={onSelectAll}
        on:action={onBulkAction}
      />
    </BottomFloat>
  {/if}
{/if}
<ComponentBaseLayer
  hasDragAndDrop={true}
  on:syncDown={() => refresh()}
  subscribeToResource={new Set([Resource.link])}
  subscribeToContext={new Set([id.toString()])}
  on:change={() => refresh()}
/>
