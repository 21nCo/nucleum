<script lang="ts">
  import {
    BlockAction,
    type IMarkdown,
    type IMarkdownParams
  } from "$lib/client/components/markdown/md.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Block from "./Block.svelte";
  import { getMdStore, mdContentChangeEvent } from "./markdown.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidAndUniqueArray } from "$lib/shared/utils/obj.utils";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { setContext } from "svelte";
  import { generateMarkdownText } from "$lib/client/products/memotron/node/node.utils";
  import { logger } from "../debug/logger.client";
  import { get } from "svelte/store";
  import { KeyboardKey } from "$lib/client/types/keyboard.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import {
    reorderList,
    type DragDropEvent
  } from "$lib/client/actions/rearrange.action";
  import {
    isSameResource,
    resourceInList,
    shiftResourceInArray
  } from "../flux/resourceStores/resource.utils";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import context from "$lib/client/stores/context.store";
  import MarkdownkeyboardToolbar from "./toolbar/MarkdownkeyboardToolbar.svelte";
  import { debouncer } from "$lib/client/utils/utils";
  import { toasts } from "$lib/client/stores/notification.store";
  import { dragSelection } from "$lib/client/actions/dragSelection.action";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import BulkEditBar from "../record/BulkEditBar.svelte";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "../flux/resourceStores/resource.type";
  import { resolveMultiSelectStore } from "../flux/resourceStores/resource.store";
  import { generateResourceId } from "../flux/flux.utils";
  import { ErrorMessage } from "../error/error.type";
  import view from "$lib/client/stores/view.store";

  /**
   * Propagates the event to the parent component.
   *
   * Repropagating by tapping the events from children to parent as blocks in `md` are not latest versions during some events when the NodularMarkdown component is receiving the events directly without interference from this component.
   *
   * @param event
   * @param data
   */
  function propagate(event: string, data: any) {
    dispatch(event, {
      ...data,
      md: { ...md, blocks: $mdStore.blocks }
    });
  }

  function markdownContext(message: any) {
    if (!message) return;
    if (message.event === "focus") {
      resetSelection();
      focusedBlock = message.id;
      return;
    } else if (message.event === "blur") {
      if (focusedBlock === message.id) {
        focusedBlock = undefined;
      }
    }
    if (message.event) propagate(message.event, message.data);
  }
  setContext("markdown", markdownContext);

  export let md: IMarkdown | undefined = undefined;
  export let params: IMarkdownParams | undefined = undefined;
  export let parentBackgroundIndex: number | undefined = undefined;
  const dispatch = createEventDispatcher();
  export let id: string | undefined = undefined;
  let mdId: string = id ?? generateSimpleRandomId();
  const mdStore = getMdStore(mdId);
  const containerId = `nodecontainer-${mdId}`;
  mdStore.load(md, { isPreventFocus: params?.isPreventFocusOnLoad });
  $: if (params) mdStore?.setParams(params);
  // $: console.log("blocks", $mdStore.blocks);
  let keyboardToolbarPanelSelection: string | undefined = undefined;
  let keyboardToolbarRef: MarkdownkeyboardToolbar | undefined = undefined;
  let focusedBlock: IRecordId | undefined = undefined;

  let isInSelectionMode = false;
  let isSelectionConsecutive = false;
  $: multiSelectContext = {
    resource: Resource.node,
    accessPoint: ResourceAccessPoint.MARKDOWN,
    accessPointId: id
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

  onMount(() => {
    const mdChangeSub = mdContentChangeEvent.subscribe((val) => {
      if (md && "blocks" in md) md = { ...md, blocks: $mdStore.blocks };
      else md = { blocks: $mdStore.blocks };
      dispatch("blocks", $mdStore.blocks);
      dispatchDebouncedChangeEvent();
    });
    return () => {
      mdChangeSub();
    };
  });

  const dispatchDebouncedChangeEvent = debouncer(() => {
    dispatch("debouncedChange", md);
  }, 1000);

  function onKeyDown(event: KeyboardEvent) {
    const focus = get(mdStore.focus);
    logger.log({
      key: event.key,
      focusedBlock: focus,
      at: "Markdown.svelte"
    });
    if (event.key === KeyboardKey.ESCAPE && focus) {
      mdStore.focus.set(undefined);
      event.stopPropagation();
    }
  }

  export function focus(blockId?: IRecordId) {
    if (blockId) {
      mdStore.focus.set({ id: blockId });
    } else {
      mdStore.focus.set({ id: md?.blocks[0].id });
    }
  }

  function onReorderBlocks(event: DragDropEvent) {
    logger.log({ event, at: "Markdown.svelte onReorderBlocks" });
    let { fromId, toId } = event;
    if (
      !event ||
      event.listId !== "markdown" ||
      !fromId ||
      !toId ||
      fromId === toId
    )
      return;
    if (isInSelectionMode) {
      handleReorderBlocksInSelectionMode(event);
      return;
    }
    const fromBlock = $mdStore.blocks.find(resourceInList(fromId));
    const toBlock = $mdStore.blocks.find(resourceInList(toId));
    const toIndex = $mdStore.blocks.findIndex(resourceInList(toId));
    const toSiblingBlock = $mdStore.blocks[toIndex + 1];
    let needsReconciliation =
      fromBlock?.contentType === NodeType.ORDERED_LIST &&
      (toBlock?.contentType === NodeType.ORDERED_LIST ||
        toSiblingBlock?.contentType === NodeType.ORDERED_LIST);
    $mdStore.blocks = shiftResourceInArray($mdStore.blocks, fromId, toId, true);
    dispatch("rearrange", {
      md: { ...md, blocks: $mdStore.blocks }
    });
    if (needsReconciliation) {
      const changedBlocks = mdStore.reconcileOrderedListOnDrag(fromId);
      changedBlocks?.forEach((b) => {
        propagate(BlockAction.CHANGE, {
          id: b.id,
          body: b.body
        });
      });
    }
  }
  function handleReorderBlocksInSelectionMode(event: DragDropEvent) {
    let { toId } = event;
    if ($multiSelectStore.length === 0 || !toId) {
      return;
    }
    if (
      $multiSelectStore.some((selectedId) => selectedId === toId.toString())
    ) {
      return;
    }
    const selectedBlocks = $mdStore.blocks.filter((block) =>
      $multiSelectStore.some((selectedId) => block.id.toString() === selectedId)
    );

    let newBlocks = $mdStore.blocks.filter(
      (block) =>
        !$multiSelectStore.some(
          (selectedId) => block.id.toString() === selectedId
        )
    );

    const newToIndex = newBlocks.findIndex(resourceInList(toId));
    const insertIndex = newToIndex + 1;
    newBlocks.splice(insertIndex, 0, ...selectedBlocks);
    $mdStore.blocks = newBlocks;
    //TODO - check for reconciliation scenarios
    dispatch("rearrange", {
      md: { ...md, blocks: $mdStore.blocks }
    });
    resetSelection();
  }

  function resetSelection() {
    $multiSelectStore = [];
    keyboardToolbarPanelSelection = undefined;
    isInSelectionMode = false;
    isSelectionConsecutive = false;
  }

  function onBulkAction(action: BlockAction | ResourceActionType, data?: any) {
    try {
      if (action === BlockAction.DELETE) {
        mdStore.deleteMany($multiSelectStore);
        propagate("action", {
          action: BlockAction.DELETE_MANY,
          source: $multiSelectStore
        });
        resetSelection();
        return;
      }
      const selectedBlocks = $mdStore.blocks.filter((block) =>
        $multiSelectStore.some(
          (selectedId) => block.id.toString() === selectedId
        )
      );
      const blocksLengthText =
        selectedBlocks.length > 1
          ? ` ${selectedBlocks.length} blocks`
          : ` ${selectedBlocks.length} block`;
      if (action === ResourceActionType.DUPLICATE) {
        const duplicatedBlocks = selectedBlocks.map((block) => ({
          ...block,
          id: generateResourceId(Resource.node)
        }));
        const lastSelectedBlockIndex = Math.max(
          ...selectedBlocks.map((block) =>
            $mdStore.blocks.findIndex((b) => isSameResource(b.id, block.id))
          )
        );
        const lastSelectedBlock = $mdStore.blocks[lastSelectedBlockIndex];
        mdStore.insertMany(lastSelectedBlock.id, duplicatedBlocks);
        propagate("action", {
          action: BlockAction.INSERT_MANY,
          source: $multiSelectStore,
          blocks: duplicatedBlocks
        });
        resetSelection();
        toasts.success(`Duplicated ${blocksLengthText}`);
      } else if (action === ResourceActionType.COPY_CONTENTS) {
        const markdownText = generateMarkdownText(selectedBlocks);
        navigator.clipboard.writeText(markdownText);
        toasts.success(`Copied ${blocksLengthText} to clipboard`);
      } else if (action === ResourceActionType.CONVERT) {
        //TODO: Implement convert
        resetSelection();
        toasts.success(`Converted ${blocksLengthText} to ${data.toType}`);
      }
    } catch (e) {
      logger.error({ at: "Markdown.svelte onBulkAction", error: e });
      toasts.error(ErrorMessage.DEFAULT);
    }
  }

  function refreshConsecutiveSelectionState() {
    try {
      const selectedIndices = $multiSelectStore
        .map((id) =>
          $mdStore.blocks.findIndex((block) => block.id.toString() === id)
        )
        .filter((index) => index !== -1)
        .sort((a, b) => a - b);

      isSelectionConsecutive =
        selectedIndices.length > 1 &&
        selectedIndices.every(
          (index, i) => i === 0 || index === selectedIndices[i - 1] + 1
        );
    } catch (e) {
      logger.error({
        at: "Markdown.svelte refreshConsecutiveSelectionState",
        error: e
      });
    }
  }
</script>

<button
  id="markDown-{mdId}"
  class="relative flex flex-col justify-start items-start text-start w-full h-full"
  on:keydown={onKeyDown}
>
  <div class="flex justify-between">
    <div class="flex gap-2 items-center">
      <slot name="title">
        {#if params?.title}
          <Text content={params.title} style={TextStyle.PANEL_HEADING} />
        {/if}
      </slot>
    </div>
    <div class="absolute flex gap-2 top-0 right-0 z-40">
      {#if params?.actions?.includes("copy")}
        <div>
          <Button
            icon="copy"
            label="Copy markdown"
            size={Size.xs}
            parentBgIndex={parentBackgroundIndex}
            on:click={() => {
              const markdownAsText = generateMarkdownText($mdStore.blocks);
              navigator.clipboard.writeText(markdownAsText);
              toasts.success("Copied to clipboard");
            }}
          />
        </div>
      {/if}
      {#if params?.actions?.includes("copyRaw")}
        <div>
          <Button
            icon="copy"
            tooltip="Copy raw md"
            label="Copy raw md"
            size={Size.xs}
            parentBgIndex={parentBackgroundIndex}
            on:click={() => {
              const rawMdJson = JSON.stringify($mdStore.blocks);
              navigator.clipboard.writeText(rawMdJson);
              toasts.success("Copied to clipboard");
            }}
          />
        </div>
      {/if}
    </div>
  </div>
  <div
    id="mdContent"
    class="grow w-full relative"
    use:reorderList={{
      listId: "markdown",
      draggedOverClass: "!border-b-aps1 !rounded-none",
      onDrop: onReorderBlocks,
      dragImage:
        $multiSelectStore.length > 0
          ? `moving ${$multiSelectStore.length} blocks`
          : "dragimage"
    }}
    use:dragSelection={{
      selectableSelector: "div[id^='md-block-']",
      containerId: containerId,
      onSelectionChange: (elements, ids) => {
        if (isInSelectionMode) {
          $multiSelectStore = [
            ...new Set([...($multiSelectStore ?? []), ...ids])
          ];
        } else {
          isInSelectionMode = true;
          $multiSelectStore = ids;
        }
      },
      onSelectionEnd: (elements, ids) => {
        if (ids.length > 0) {
          refreshConsecutiveSelectionState();
          keyboardToolbarPanelSelection = "actions";
          keyboardToolbarRef?.action("actions");
        } else {
          keyboardToolbarPanelSelection = undefined;
          isSelectionConsecutive = false;
        }
      }
    }}
  >
    {#if isValidAndUniqueArray($mdStore.blocks)}
      {#each $mdStore.blocks as block, index (block.id)}
        {@const isSelected = $multiSelectStore.some(resourceInList(block.id))}
        <Block
          {block}
          {mdStore}
          {index}
          {isSelected}
          isRearrangeBlockInSelectionMode={isSelected &&
            isSelectionConsecutive &&
            $mdStore.blocks
              .find((b) =>
                $multiSelectStore.some(
                  (selectedId) => b.id.toString() === selectedId
                )
              )
              ?.id.toString() === block.id.toString()}
          isInSelectionMode={$multiSelectStore.length > 0}
          on:nodularize={(e) => {
            propagate("focus", e.detail);
          }}
          on:popoverVisibility={(e) => {
            if (e.detail) {
              resetSelection();
            }
          }}
          on:select={(e) => {
            const isAlreadyExists = $multiSelectStore.some(
              resourceInList(block.id)
            );
            if (isAlreadyExists) {
              $multiSelectStore = $multiSelectStore.filter(
                (x) => !isSameResource(x, block)
              );
              if ($multiSelectStore.length === 0) {
                keyboardToolbarPanelSelection = undefined;
              }
            } else {
              $multiSelectStore = [...$multiSelectStore, block.id.toString()];
              keyboardToolbarPanelSelection = "actions";
              keyboardToolbarRef?.action("actions");
            }
            refreshConsecutiveSelectionState();
          }}
        />
      {/each}
    {:else}
      <InlineErrorMessage
        isDissappear={false}
        error="Invalid markdown content. Pleae try again after sometime."
      />
    {/if}
  </div>
</button>
{#if $multiSelectStore.length > 0}
  <BottomFloat zIndex="z-30" {containerId}>
    <BulkEditBar
      isExpandedMode={!$view.isConstrainedWidth}
      context={multiSelectContext}
      on:action={(e) => onBulkAction(e.detail)}
      on:actionWithContext={(e) =>
        onBulkAction(e.detail.action, e.detail.context)}
      on:selectAll={() => {
        $multiSelectStore = $mdStore.blocks.map((b) => b.id.toString());
      }}
    />
  </BottomFloat>
{/if}
{#if $context.isTouchDevice && (focusedBlock || keyboardToolbarPanelSelection)}
  <MarkdownkeyboardToolbar
    bind:this={keyboardToolbarRef}
    bind:keyboardToolbarPanelSelection
    selectedBlocks={$multiSelectStore}
    on:select={() => {
      if (focusedBlock) $multiSelectStore = [focusedBlock];
    }}
    on:unselect={() => {
      $multiSelectStore = [];
    }}
    on:action={(e) => {
      const { action, data } = e.detail;
      if ($multiSelectStore.length === 1) {
        mdStore.alterBlock({ action, data, blockId: $multiSelectStore[0] });
      } else if (
        $multiSelectStore.length === 0 &&
        action === BlockAction.INSERT &&
        focusedBlock
      ) {
        mdStore.alterBlock({ action, data, blockId: focusedBlock });
      } else {
        onBulkAction(action);
      }
      $multiSelectStore = [];
    }}
    on:insert={(e) => {
      const toType = e.detail;
      const block = $mdStore.blocks.find(resourceInList($multiSelectStore[0]));
      if (!block) return;
      if (block.contentType === NodeType.SIMPLE_TEXT && !block.body) {
        mdStore.alterBlock({
          action: BlockAction.CONVERT,
          data: { toType },
          blockId: block.id
        });
      } else {
        mdStore.alterBlock({
          action: BlockAction.INSERT,
          data: { blockType: toType },
          blockId: block.id
        });
      }
      $multiSelectStore = [];
    }}
    on:focus={() => {
      if ($multiSelectStore.length === 1)
        mdStore.focusBlock($multiSelectStore[0]);
    }}
  />
{/if}
