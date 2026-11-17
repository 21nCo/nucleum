<script lang="ts">
  import { Arrangement } from "@21n/ui/elements/direction.enum";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import type { IProperty } from "@nucleum/features/collections/properties/property.type";
  import NodeRecords from "@nucleum/features/memory/node/NodeRecords.svelte";
  import type { ICollectionItem } from "@nucleum/features/collections/collection.type";
  import type { INodeThumb } from "@nucleum/features/memory/node/node.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { requireRecordRenderer } from "@nucleum/shared-state/resources/record-renderer";
  import { itemNavigation } from "@21n/ui/actions/itemNavigation.action";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { bulkEditStore } from "@nucleum/shared-state/resources/bulkedit.store";
  import { resolveBulkSelectionAccessPointId } from "@nucleum/datafn/resource.utils";
  import {
    createRangeSelection,
    toggleResourceSelection
  } from "@nucleum/features/records/resource.actions";
  const Records = requireRecordRenderer();

  let {
    items = [],
    resource = undefined,
    arrangement = Arrangement.LIST,
    density = 1,
    isHidePreview = false,
    isHideTitle = false,
    parentBgIndex = 1,
    isApplyCustomColor = false,
    isDraggable = false,
    accessPointId = undefined,
    accessPoint = undefined,
    visibleProps = []
  }: {
    items?: ICollectionItem[];
    resource?: Resource | undefined;
    arrangement?: Arrangement;
    density?: number;
    isHidePreview?: boolean;
    isHideTitle?: boolean;
    parentBgIndex?: number;
    isApplyCustomColor?: boolean;
    isDraggable?: boolean;
    accessPointId?: IRecordId | undefined;
    accessPoint?: ResourceAccessPoint | undefined;
    visibleProps?: IProperty[];
  } = $props();

  let isMasonryAvailable = $derived(
    !resource || [Resource.node].includes(resource)
  );

  function resolveNodeItems() {
    return items as unknown as INodeThumb[];
  }

  /** Access point NodeRecords and its thumbnails select at. */
  let selectionAccessPoint = $derived(
    accessPoint ?? ResourceAccessPoint.BROWSER
  );
  /** The selection context NodeRecords activates for these items. */
  let nodeSelectionContext = $derived({
    resource: Resource.node,
    accessPoint: selectionAccessPoint,
    accessPointId
  });
  /**
   * Keyboard selection goes through the item menu's Select, which resolves
   * the access point id itself, so it is offered only where that resolves to
   * the NodeRecords context.
   */
  let isSelectable = $derived(
    resolveBulkSelectionAccessPointId(selectionAccessPoint, accessPointId) ===
      accessPointId
  );
  const selectRange = createRangeSelection();

  function resolveElementNode(element: HTMLElement) {
    const id = element.getAttribute("data-id");
    return resolveNodeItems().find((item) => item.id?.toString() === id);
  }

  function openFromKeyboard(element: HTMLElement, event: KeyboardEvent) {
    const item = resolveElementNode(element);
    if (item) navigation.resourceClickHandler(event, item.id);
  }

  function toggleFromKeyboard(element: HTMLElement) {
    const item = resolveElementNode(element);
    if (!item) return;
    toggleResourceSelection(item.id, selectionAccessPoint, accessPointId);
  }

  function extendFromKeyboard(
    elements: HTMLElement[],
    isNewRange: boolean,
    anchorElement: HTMLElement
  ) {
    const anchor = resolveElementNode(anchorElement);
    if (!anchor) return;
    const nodes = elements
      .map(resolveElementNode)
      .filter((item): item is INodeThumb => !!item);
    if (!bulkEditStore.matchesContext(nodeSelectionContext)) {
      toggleResourceSelection(anchor.id, selectionAccessPoint, accessPointId);
      isNewRange = true;
    }
    selectRange(
      nodes.map((item) => item.id),
      isNewRange
    );
  }

  function hasSelectionInContext() {
    return (
      bulkEditStore.getState().selectedIds.length > 0 &&
      bulkEditStore.matchesContext(nodeSelectionContext)
    );
  }
</script>

{#if isMasonryAvailable}
  <div
    class="w-full h-full"
    use:itemNavigation={{
      itemSelector: "[id^='thumbnail-'][data-id]",
      onOpen: openFromKeyboard,
      onToggle: isSelectable ? toggleFromKeyboard : undefined,
      onExtend: isSelectable ? extendFromKeyboard : undefined,
      hasSelection: hasSelectionInContext
    }}
  >
    <NodeRecords
      nodes={resolveNodeItems()}
      {arrangement}
      {isHidePreview}
      {isHideTitle}
      {density}
      {isDraggable}
      {accessPointId}
      {accessPoint}
      {isApplyCustomColor}
      {visibleProps}
      {parentBgIndex}
    />
  </div>
{:else}
  <Records
    {resource}
    data={items}
    {arrangement}
    {accessPoint}
    {visibleProps}
  />
{/if}
