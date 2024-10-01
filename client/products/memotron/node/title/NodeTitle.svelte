<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import type { IActiveNodeStore } from "../node.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import NodeTitleLabelPart from "./NodeTitleLabelPart.svelte";
  import { NodeType, webNodeTypeList } from "../node.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  export let node: IActiveNodeStore;
  function onLabelChange(e: any) {
    if ($node.label) node.debouncedModify({ label: $node.label });
  }
  $: isWebNode = webNodeTypeList.includes($node.contentType);
</script>

<div class="flex items-center flex-1 min-w-0 gap-2">
  {#if !$node.focusedBlock}
    {#if !isWebNode || $node.contentType === NodeType.WEB_PAGE}
      <NodeAvatar node={$node} size={Size.sm} />
    {/if}
    {#if $isInEditMode && !isWebNode}
      <TextInput
        size={Size.xl}
        bind:value={$node.label}
        placeholder="Node title"
        width="w-full"
        on:input={onLabelChange}
      />
      <Button
        icon="ph:check-circle"
        size={Size.sm}
        on:click={() => {
          isInEditMode.toggle();
        }}
      />
    {:else}
      <span class={cn("text-h4 font-medium text-start truncate")}>
        <!-- {$node.label ?? $node.body ?? ""} -->
        <NodeTitleLabelPart node={$node} isNodePageContext={true} />
      </span>
    {/if}
    {#if $node.isStarred}
      <Icon icon="star" class="fill-yellow-400" />
    {/if}
  {/if}
</div>
