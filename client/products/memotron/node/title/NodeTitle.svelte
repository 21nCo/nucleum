<script lang="ts">
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import NodeTitleLabelPart from "@21n/products/memotron/node/title/NodeTitleLabelPart.svelte";
  import type { IActiveNode } from "@21n/products/memotron/node/node.type";
  import { createEventDispatcher } from "svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import context from "@21n/stores/context.store";
  import TextInputOnKeyboardToolbar from "@21n/elements/input/TextInputOnKeyboardToolbar.svelte";
  import RecordStarStatusFeedback from "@21n/components/record/RecordStarStatusFeedback.svelte";
  export let node: IActiveNode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  let previousLabel = node.label;
  let isKeyboardEditorMounted = false;
  const dispatch = createEventDispatcher();
  let keyboardEditorRef: TextInputOnKeyboardToolbar;
  let textInputRef: TextInput;
  function onLabelChange(e: any) {
    dispatch("labelChange", e.detail);
  }
</script>

<div
  class={cn("flex items-center flex-1 min-w-0 gap-2", {
    "max-w-fit": !node.isInEditMode,
    "h-12": accessPoint !== ResourceAccessPoint.CLIPPER
  })}
>
  {#if !node.focusedBlock}
    {#if node.isInEditMode}
      {#if $context.isTouchDevice}
        <TextInputOnKeyboardToolbar
          bind:value={node.label}
          bind:this={keyboardEditorRef}
          on:debouncedChange={onLabelChange}
          on:mount={() => {
            isKeyboardEditorMounted = true;
            keyboardEditorRef?.focus();
          }}
          on:save={() => {
            dispatch("editModeChange", false);
          }}
          on:cancel={() => {
            node.label = previousLabel;
            isKeyboardEditorMounted = false;
            dispatch("labelChange", node.label);
            dispatch("editModeChange", false);
          }}
        />
      {/if}
      <TextInput
        size={Size.xl}
        bind:value={node.label}
        bind:this={textInputRef}
        placeholder="Enter title"
        width="w-full"
        on:mount={() => {
          textInputRef?.focus();
          keyboardEditorRef?.focus();
        }}
        isPreserveKeyboardToolbar={isKeyboardEditorMounted}
        isShowSaveControl={true}
        on:enter={() => {
          dispatch("labelChange", node.label);
          dispatch("editModeChange", false);
        }}
        on:save={() => {
          dispatch("labelChange", node.label);
          dispatch("editModeChange", false);
        }}
        on:cancel={() => {
          node.label = previousLabel;
          dispatch("labelChange", node.label);
          dispatch("editModeChange", false);
        }}
      />
    {:else}
      <span class="text-start truncate">
        <!-- {$node.label ?? $node.body ?? ""} -->
        <NodeTitleLabelPart
          item={node}
          isNodePageContext={true}
          {accessPoint}
          on:click={() => {
            previousLabel = node.label;
            dispatch("editModeChange", true);
          }}
        />
      </span>
    {/if}
    <RecordStarStatusFeedback isStarred={node.isStarred} />
  {/if}
</div>
