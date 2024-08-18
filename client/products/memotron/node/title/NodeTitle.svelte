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
  export let node: IActiveNodeStore;
  function onLabelChange(e: any) {
    console.log("onLabelChange", e);
    if ($node.label) node.debouncedModify({ label: $node.label });
  }
</script>

<div class="flex items-center gap-3 grow">
  {#if !$node.focusedBlock}
    <NodeAvatar avatars={$node.avatars} node={$node} size={Size.sm} />
    {#if $isInEditMode}
      <TextInput
        size={Size.xl}
        bind:value={$node.label}
        style={InputStyle.PLAIN}
        placeholder="Node title"
        width="w-full"
        on:input={onLabelChange}
      />
    {:else}
      <span class={cn("text-h4 font-medium text-start truncate")}>
        <!-- {$node.label ?? $node.body ?? ""} -->
        <NodeTitleLabelPart node={$node} />
      </span>
    {/if}
    {#if $node.isStarred}
      <Icon icon="star" class="fill-yellow-400" />
    {/if}
  {/if}
</div>
