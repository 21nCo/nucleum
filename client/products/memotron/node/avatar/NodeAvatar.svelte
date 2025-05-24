<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import {
    type IActiveNode,
    type INode,
    NodeType,
    webNodeTypeList
  } from "../node.type";
  import { resolveFileIcon, resolveNodeIcon } from "../node.utils";
  import NodeFavicon from "./NodeFavicon.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resolveAvatar } from "$lib/client/components/collection/collection.utils";
  export let node: INode | IActiveNode | undefined = undefined;
  export let size: Size.sm | Size.md | Size.lg | number = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  let _avatars: IAvatar[] | undefined = undefined;

  onMount(() => {
    refreshAvatar();
  });

  function refreshAvatar() {
    if (!node) return;
    if (node.avatar) {
      _avatars = node.avatar;
    } else if (node.types) {
      _avatars = resolveAvatar(node.types);
    } else if (node.collections) {
      // TODO - resolve avatars from in memory typed collections cache
    }
  }
  // $: console.log({
  //   at: "NodeAvatar",
  //   node,
  //   _avatars
  // });
</script>

{#if _avatars && _avatars.length > 0}
  <span class="flex justify-center items-center">
    {#each _avatars as avatar, index (avatar)}
      <div
        class={cn("flex justify-center items-center", {
          "-ml-1": index !== 0
        })}
      >
        <AvatarRenderer {avatar} {size} />
      </div>
    {/each}
  </span>
{:else if node && webNodeTypeList.includes(node.contentType)}
  <NodeFavicon {node} {size} />
{:else if node && node.contentType === NodeType.FILE}
  <Icon icon={resolveFileIcon(node.file)} {size} />
{:else if node && node.contentType}
  <Icon icon={resolveNodeIcon(node.contentType)} {size} />
{/if}
