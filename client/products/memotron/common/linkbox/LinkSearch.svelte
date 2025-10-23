<script lang="ts">
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import LinkSearchResultItem from "@21n/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  import type { IPopoverOptions } from "@21n/types/popover.type";
  import { Placement } from "@21n/types/direction.enum";
  import { type InputLabel, InputStyle } from "@21n/types/input.type";
  import { SearchStore } from "@21n/components/record/record.store";
  import { onMount } from "svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { isExtensionEnvironment } from "@21n/utils/browser.utils";
  import { createEventDispatcher } from "svelte";
  import view from "@21n/stores/view.store";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import { collectionStore } from "@21n/components/collection/collection.store";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { toasts } from "@21n/stores/notification.store";
  import type { IRecordId } from "@21n/types/data.type";
  import context from "@21n/stores/context.store";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  const dispatch = createEventDispatcher();
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CAPTURE;
  export let isCollectionsLane: boolean = false;
  export let resultsPlacement: Placement = Placement.BottomCenter;
  export let searchQuery: string;
  export let onSelectCallback: ((item: any) => void) | undefined = undefined;
  export let onHideCallback: (() => void) | undefined = undefined;
  export let excludeFromSearch: IRecordId[] = [];
  let popoverOptions: IPopoverOptions;
  let inputStyle: InputStyle = InputStyle.PLAIN;
  let placeholder: string =
    "Start typing to link to a node or add to a curation";
  let icon: string = "";
  let label: InputLabel | undefined = undefined;
  let searchInputRef: TextSearchInput;
  let isCreationInProgress = false;

  $: (accessPoint, isCollectionsLane, resultsPlacement, resolveOptions());

  export function focus() {
    searchInputRef?.focus();
    searchInputRef?.showDefaultResults();
  }

  onMount(() => {
    if (isCollectionsLane) {
      focus();
    }
  });

  function resolveOptions() {
    switch (accessPoint) {
      case ResourceAccessPoint.CAPTURE:
        popoverOptions = {
          offsetInPx: 12,
          placement: Placement.TopCenter
        };
        placeholder = "Link to a node or add to a collection";
        inputStyle = InputStyle.PLAIN;
        break;
      case ResourceAccessPoint.NODE_LINKS:
        popoverOptions = {
          placement: Placement.BottomCenter
        };
        placeholder = "Start searching to add a direct link";
        icon = "link";
        inputStyle = InputStyle.BORDERED;
        break;
      case ResourceAccessPoint.CLIPPER:
        popoverOptions = {
          offsetInPx: 6,
          isUseAbsolutePositioning: true,
          placement: resultsPlacement
        };
        placeholder = "Link to a node or add to a collection";
        icon = "link";
        inputStyle = InputStyle.BORDERED;
        break;
    }
    if (isCollectionsLane) {
      popoverOptions = {
        offsetInPx: 4,
        placement: Placement.TopCenter
      };
      placeholder = "Start searching to add to a collection";
      inputStyle = InputStyle.BORDERED;
    }
  }

  function onsearch(searchQuery: string) {
    let query = searchQuery;
    let resource = isCollectionsLane
      ? Resource.collection
      : accessPoint === ResourceAccessPoint.NODE_LINKS
        ? Resource.node
        : undefined;
    if (
      searchQuery?.startsWith("@") &&
      accessPoint !== ResourceAccessPoint.NODE_LINKS
    ) {
      resource = Resource.collection;
      query = searchQuery.slice(1);
    }
    if (isExtensionEnvironment()) {
      return new SearchStore().searchForLinkingOnExtension(query, resource);
    }
    return new SearchStore().searchForLinking(query, {
      resource,
      exclude: excludeFromSearch,
      collectionResource:
        accessPoint === ResourceAccessPoint.GOAL
          ? [Resource.goal]
          : accessPoint === ResourceAccessPoint.NODE
            ? [Resource.node]
            : undefined
    });
  }

  function onSelect(e: CustomEvent) {
    onSelectCallback?.(e.detail.item);
    dispatch("select", e.detail);
    if (searchInputRef && typeof searchInputRef.reset === "function")
      searchInputRef.reset();
  }

  function onHide() {
    onHideCallback?.();
    dispatch("hide");
  }

  function resolveResourceForCreation(
    accessPoint: ResourceAccessPoint
  ): Resource | undefined {
    switch (accessPoint) {
      case ResourceAccessPoint.CAPTURE:
      case ResourceAccessPoint.CLIPPER:
      case ResourceAccessPoint.NODE:
        return Resource.node;
      case ResourceAccessPoint.GOAL:
        return Resource.goal;
      default:
        return undefined;
    }
  }

  async function onEmptyEnter(
    e: CustomEvent<{ event: KeyboardEvent; value: string }>
  ) {
    if (!e.detail.event || !e.detail.value) return;
    isCreationInProgress = true;
    let result: any;
    if (
      isCollectionsLane ||
      ((accessPoint === ResourceAccessPoint.CAPTURE ||
        accessPoint === ResourceAccessPoint.CLIPPER) &&
        (e.detail.event.shiftKey || e.detail.value.startsWith("@")))
    ) {
      let val = e.detail.value;
      if (val.startsWith("@")) {
        val = val.slice(1);
      }
      result = await collectionStore.save(
        {
          label: val,
          resource: resolveResourceForCreation(accessPoint)
        },
        {
          isIgnorePropertyEditor: true
        }
      );
    } else {
      result = await nodeStore.create({
        label: e.detail.value,
        contentType: NodeType.NODULAR_MARKDOWN,
        body: ""
      });
    }
    if (result && isValidArrayWithData(result)) {
      onSelect({ detail: { item: result[0] } } as CustomEvent);
      if (searchInputRef && typeof searchInputRef.reset === "function")
        searchInputRef.reset();
    } else {
      toasts.error("Something went wrong. Please try again later.");
    }
    isCreationInProgress = false;
  }

  function resolveEmptyStateLabel(searchQuery: string, isSaving: boolean) {
    if (isSaving) {
      return `Creating...`;
    }
    if (isCollectionsLane || searchQuery?.startsWith("@")) {
      return `No collections found. Press **Enter** to create a new collection`;
    } else if (accessPoint === ResourceAccessPoint.NODE_LINKS) {
      return `No nodes found. Press **Enter** to create a new node`;
    } else {
      return $context.isTouchDevice
        ? `No results found. Press **Enter** to create a new node`
        : `No results found. Press **Enter** to create a new node or **Shift + Enter** to create a new collection`;
    }
  }

  function resolveBottomMessage(accessPoint: ResourceAccessPoint) {
    switch (accessPoint) {
      case ResourceAccessPoint.CAPTURE:
      case ResourceAccessPoint.CLIPPER:
        return "Use **@** prefix to search for collections";
      default:
        return undefined;
    }
  }
</script>

<TextSearchInput
  bind:this={searchInputRef}
  bind:value={searchQuery}
  isInline={isCollectionsLane}
  width={$view.isConstrainedWidth
    ? "w-full"
    : isCollectionsLane && $view.isPortrait
      ? "w-80"
      : undefined}
  style={inputStyle}
  {icon}
  {label}
  searchResultComponent={LinkSearchResultItem}
  searchResultComponentProps={{
    isHideResourceType:
      isCollectionsLane || accessPoint === ResourceAccessPoint.NODE_LINKS
  }}
  {popoverOptions}
  emptyStateLabel={resolveEmptyStateLabel(searchQuery, isCreationInProgress)}
  on:select={onSelect}
  on:hide={onHide}
  on:empty-enter={onEmptyEnter}
  on:focus
  searchCallback={onsearch}
  {placeholder}
  isShowPopoverOnFocus={true}
  bottomMessage={resolveBottomMessage(accessPoint)}
/>
