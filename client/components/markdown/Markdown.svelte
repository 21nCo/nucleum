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
  mdStore.load(md, { isPreventFocus: params?.isPreventFocusOnLoad });
  $: if (params) mdStore?.setParams(params);
  // $: console.log("blocks", $mdStore.blocks);
  let keyboardToolbarPanelSelection: string | undefined = undefined;
  let keyboardToolbarRef: MarkdownkeyboardToolbar | undefined = undefined;
  let focusedBlock: IRecordId | undefined = undefined;
  let selectedBlocks: IRecordId[] = [];

  onMount(() => {
    const mdChangeSub = mdContentChangeEvent.subscribe((val) => {
      // console.log("md content changed", val);
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
</script>

<button
  id="markDown-{mdId}"
  class="relative flex flex-col justify-start items-start text-start w-full h-full"
  on:keydown={onKeyDown}
>
  <div class="flex justify-between">
    <div>
      {#if params?.title}
        <Text content={params.title} style={TextStyle.PANEL_HEADING} />
      {/if}
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
            }}
          />
        </div>
      {/if}
    </div>
  </div>
  <div
    id="mdContent"
    class="grow w-full"
    use:reorderList={{
      listId: "markdown",
      draggedOverClass: "!border-b-aps1 !rounded-none",
      onDrop: onReorderBlocks,
      dragImage: "dragimage"
    }}
  >
    {#if isValidAndUniqueArray($mdStore.blocks)}
      {#each $mdStore.blocks as block, index (block.id)}
        <Block
          {block}
          {mdStore}
          {index}
          isSelected={selectedBlocks.some(resourceInList(block.id))}
          on:nodularize={(e) => {
            propagate("focus", e.detail);
          }}
          on:select={(e) => {
            const isAlreadyExists = selectedBlocks.some(
              resourceInList(block.id)
            );
            if (isAlreadyExists) {
              selectedBlocks = selectedBlocks.filter(
                (x) => !isSameResource(x, block)
              );
              if (selectedBlocks.length === 0) {
                keyboardToolbarPanelSelection = undefined;
              }
            } else {
              selectedBlocks = [...selectedBlocks, block.id];
              keyboardToolbarPanelSelection = "actions";
              keyboardToolbarRef?.action("actions");
            }
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
{#if $context.isTouchDevice && (focusedBlock || keyboardToolbarPanelSelection)}
  <MarkdownkeyboardToolbar
    bind:this={keyboardToolbarRef}
    bind:keyboardToolbarPanelSelection
    {selectedBlocks}
    on:select={() => {
      if (focusedBlock) selectedBlocks = [focusedBlock];
    }}
    on:unselect={() => {
      selectedBlocks = [];
    }}
    on:action={(e) => {
      const { action, data } = e.detail;
      if (selectedBlocks.length === 1) {
        mdStore.alterBlock({ action, data, blockId: selectedBlocks[0] });
      } else if (
        selectedBlocks.length === 0 &&
        action === BlockAction.INSERT &&
        focusedBlock
      ) {
        mdStore.alterBlock({ action, data, blockId: focusedBlock });
      } else {
        //TODO - other bulk block actions
        if (action === BlockAction.DELETE) {
          mdStore.deleteMany(selectedBlocks);
          propagate("action", {
            action: BlockAction.DELETE_MANY,
            source: selectedBlocks
          });
        }
      }
      selectedBlocks = [];
    }}
    on:insert={(e) => {
      const toType = e.detail;
      const block = $mdStore.blocks.find(resourceInList(selectedBlocks[0]));
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
      selectedBlocks = [];
    }}
    on:focus={() => {
      if (selectedBlocks.length === 1) mdStore.focusBlock(selectedBlocks[0]);
    }}
  />
{/if}
