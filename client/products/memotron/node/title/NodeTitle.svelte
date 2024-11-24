<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import NodeTitleLabelPart from "./NodeTitleLabelPart.svelte";
  import { NodeType, webNodeTypeList, type INode } from "../node.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { createEventDispatcher } from "svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  const dispatch = createEventDispatcher();
  function onLabelChange(e: any) {
    dispatch("labelChange", e.detail);
  }
  $: isWebNode = webNodeTypeList.includes(node.contentType);
</script>

<div
  class={cn("flex items-center flex-1 min-w-0 gap-2", {
    "max-w-fit": !node.isInEditMode
  })}
>
  {#if !node.focusedBlock}
    <!-- {#if !isWebNode || node.contentType === NodeType.WEB_PAGE}
      <NodeAvatar
        {node}
        {accessPoint}
        size={accessPoint === ResourceAccessPoint.SELF ? Size.md : Size.sm}
      />
    {/if} -->
    {#if node.isInEditMode && !isWebNode}
      <TextInput
        size={Size.xl}
        bind:value={node.label}
        placeholder="Node title"
        width="w-full"
        on:input={onLabelChange}
      />
      <Button
        icon="ph:check-circle"
        size={Size.sm}
        on:click={() => {
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
        />
      </span>
    {/if}
    {#if node.isStarred}
      <Icon icon="star" class="fill-yellow-400" />
    {/if}
  {/if}
</div>
