<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import type { ICollectionExpanded } from "../../collection/collection.type";
  import { type INode, webNodeTypeList } from "../node.type";
  import NodeFavicon from "./NodeFavicon.svelte";
  export let types: ICollectionExpanded[] | undefined = undefined;
  export let node: INode | undefined = undefined;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  let avatars: IAvatar[] | undefined = undefined;

  onMount(async () => {
    if (types && types.length > 0) await resolveAvatars();
  });

  async function resolveAvatars() {
    avatars = types?.flatMap((x) => [x.avatar]).filter((a) => a) as IAvatar[];
  }
</script>

{#if avatars && avatars.length > 0}
  <span class="flex">
    {#each avatars as avatar, index (avatar)}
      <div
        class={cn({
          "-ml-1": index !== 0
        })}
      >
        <AvatarRenderer {avatar} {size} />
      </div>
    {/each}
  </span>
{/if}
{#if node && webNodeTypeList.includes(node.contentType)}
  <NodeFavicon {node} />
{/if}
