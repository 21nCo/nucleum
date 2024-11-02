<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import type { ICollectionExpanded } from "../../collection/collection.type";
  import { nodeStore } from "../node.store";
  import { type INode, webNodeTypeList } from "../node.type";
  import { resolveNodeIcon } from "../node.utils";
  import NodeFavicon from "./NodeFavicon.svelte";
  export let types: ICollectionExpanded[] | undefined = undefined;
  export let node: INode | undefined = undefined;
  export let size: Size.sm | Size.md | Size.lg | number = Size.md;
  let _avatars: IAvatar[] | undefined = undefined;

  $: if (types && types.length > 0) {
    _avatars = nodeStore.resolveNodeAvatar(types);
  } else if (types?.length === 0) {
    _avatars = [];
  }

  onMount(() => {
    refreshAvatar();
  });

  function refreshAvatar() {
    if (node && node.avatar) {
      _avatars = node.avatar;
    } else if (types) {
      _avatars = nodeStore.resolveNodeAvatar(types);
    }
  }
</script>

{#if _avatars && _avatars.length > 0}
  <span class="flex items-center">
    {#each _avatars as avatar, index (avatar)}
      <div
        class={cn({
          "-ml-1": index !== 0
        })}
      >
        <AvatarRenderer {avatar} {size} />
      </div>
    {/each}
  </span>
{:else if node && webNodeTypeList.includes(node.contentType)}
  <NodeFavicon {node} {size} />
{:else if node}
  <Icon icon={resolveNodeIcon(node.contentType)} {size} />
{/if}
