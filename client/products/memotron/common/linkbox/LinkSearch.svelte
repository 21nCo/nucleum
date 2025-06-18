<script lang="ts">
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import LinkSearchResultItem from "./LinkSearchResultItem.svelte";
  import type { IPopoverOptions } from "$lib/client/types/popover.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { type InputLabel, InputStyle } from "$lib/client/types/input.type";
  import { SearchStore } from "../../../../components/record/record.store";
  import { onMount } from "svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  import { createEventDispatcher } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { nodeStore } from "../../node/node.store";
  import { NodeType } from "../../node/node.type";
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import {
    CollectionLayout,
    CollectionType
  } from "$lib/client/components/collection/collection.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { toasts } from "$lib/client/stores/notification.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import context from "$lib/client/stores/context.store";
  const dispatch = createEventDispatcher();
  export let ctx:
    | "capture"
    | "nodelinkspane"
    | "clipper"
    | "nodepageCollectionsLane" = "capture";
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
  resolveOptions(ctx);

  export function focus() {
    searchInputRef?.focus();
    searchInputRef?.showDefaultResults();
  }

  onMount(() => {
    if (ctx === "nodepageCollectionsLane") {
      focus();
    }
  });

  function resolveOptions(
    context: "capture" | "nodelinkspane" | "clipper" | "nodepageCollectionsLane"
  ) {
    switch (context) {
      case "capture":
        popoverOptions = {
          offsetInPx: 12,
          placement: Placement.TopCenter
        };
        placeholder = "Link to a node or add to a collection";
        inputStyle = InputStyle.PLAIN;
        break;
      case "nodelinkspane":
        popoverOptions = {
          placement: Placement.BottomCenter
        };
        placeholder = "Start searching to add a direct link";
        icon = "ph:link-light";
        inputStyle = InputStyle.BORDERED;
        break;
      case "nodepageCollectionsLane":
        popoverOptions = {
          offsetInPx: 4,
          placement: Placement.TopCenter
        };
        placeholder = "Start searching to add to a collection";
        // icon = "arrow-right-left";
        inputStyle = InputStyle.BORDERED;
        break;
      case "clipper":
        popoverOptions = {
          offsetInPx: 6,
          isUseAbsolutePositioning: true,
          placement: resultsPlacement
        };
        placeholder = "Link to a node or add to a collection";
        icon = "ph:link-light";
        inputStyle = InputStyle.BORDERED;
        break;
    }
  }

  function onsearch(searchQuery: string) {
    let query = searchQuery;
    let resource =
      ctx === "nodepageCollectionsLane"
        ? Resource.collection
        : ctx === "nodelinkspane"
          ? Resource.node
          : undefined;
    if (searchQuery?.startsWith("@")) {
      resource = Resource.collection;
      query = searchQuery.slice(1);
    }
    if (isExtensionEnvironment()) {
      return new SearchStore().searchForLinkingOnExtension(query, resource);
    }
    return new SearchStore().searchForLinking(query, {
      resource,
      exclude: excludeFromSearch
    });
  }

  function onSelect(e: CustomEvent) {
    onSelectCallback?.(e.detail.item);
    dispatch("select", e.detail);
    searchInputRef?.reset();
  }

  function onHide() {
    onHideCallback?.();
    dispatch("hide");
  }

  async function onEmptyEnter(
    e: CustomEvent<{ event: KeyboardEvent; value: string }>
  ) {
    if (!e.detail.event || !e.detail.value) return;
    let result: any;
    if (
      ctx === "nodepageCollectionsLane" ||
      ((ctx === "capture" || ctx === "clipper") &&
        (e.detail.event.shiftKey || e.detail.value.startsWith("@")))
    ) {
      let val = e.detail.value;
      if (val.startsWith("@")) {
        val = val.slice(1);
      }
      result = await collectionStore.save({
        label: val,
        type: CollectionType.UNTYPED,
        defaultLayout: CollectionLayout.BOARD
      });
    } else {
      result = await nodeStore.create({
        label: e.detail.value,
        contentType: NodeType.NODULAR_MARKDOWN,
        body: ""
      });
    }
    if (result && isValidArrayWithData(result)) {
      onSelect({ detail: { item: result[0] } } as CustomEvent);
      searchInputRef?.reset();
    } else {
      toasts.error("Something went wrong. Please try again later.");
    }
  }
  function resolveEmptyStateLabel(ctxParam: string) {
    switch (ctxParam) {
      case "nodepageCollectionsLane":
        return `No results found. Press **Enter** to create a new collection`;
      case "nodelinkspane":
        return `No results found. Press **Enter** to create a new node`;
      default:
        return $context.isTouchDevice
          ? `No results found. Press **Enter** to create a new node`
          : `No results found. Press **Enter** to create a new node or **Shift + Enter** to create a new collection`;
    }
  }
  function resolveBottomMessage(context: string) {
    switch (context) {
      case "capture":
      case "clipper":
        return "Use **@** prefix to search for collections";
      default:
        return undefined;
    }
  }
</script>

<TextSearchInput
  bind:this={searchInputRef}
  bind:value={searchQuery}
  isInline={ctx === "nodepageCollectionsLane"}
  width={$view.isConstrainedWidth
    ? "w-full"
    : ctx === "nodepageCollectionsLane" && $view.isPortrait
      ? "w-80"
      : undefined}
  style={inputStyle}
  {icon}
  {label}
  searchResultComponent={LinkSearchResultItem}
  searchResultComponentProps={{
    isHideResourceType:
      ctx === "nodepageCollectionsLane" || ctx === "nodelinkspane"
  }}
  {popoverOptions}
  emptyStateLabel={resolveEmptyStateLabel(ctx)}
  on:select={onSelect}
  on:hide={onHide}
  on:empty-enter={onEmptyEnter}
  on:focus
  searchCallback={onsearch}
  {placeholder}
  isShowPopoverOnFocus={true}
  bottomMessage={resolveBottomMessage(ctx)}
/>
