<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { type INode, webNodeTypeList } from "../node.type";
  import NodeFavicon from "./NodeFavicon.svelte";
  export let avatars: IAvatar[] | undefined = undefined;
  export let node: INode | undefined = undefined;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
</script>

<!-- {#if avatars && avatars.length > 0}
  <span class="flex">
    {#each avatars as avatar, index (avatar)}
      <div
        class={cn({
          "-ml-1": index !== 0
        })}
      >
        <AvatarView {avatar} {size} />
      </div>
    {/each}
  </span>
{/if} -->
{#if node && webNodeTypeList.includes(node.contentType)}
  <NodeFavicon {node} />
{/if}
