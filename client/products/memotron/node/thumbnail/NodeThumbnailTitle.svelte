<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { INode } from "../../node/node.type";
  import NodeTitleLabelPart from "../title/NodeTitleLabelPart.svelte";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  export let node: INode;
</script>

<div class="flex gap-1 w-full">
  <NodeAvatar {node} />
  <div class="flex-1 min-w-0">
    <div class="text-left truncate text-b2 font--medium">
      <NodeTitleLabelPart {node} />
    </div>
  </div>
  <span class="flex items-center gap-1 shrink-0">
    {#if node.url}
      <Icon icon="arrow-up-right" class="fill-fgs3" size={Size.xs} />
    {/if}
    {#if node.isStarred}
      <Icon icon="star" class="fill-yellow-400" />
    {/if}
  </span>
</div>
