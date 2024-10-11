<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ICollectionExpanded } from "../../collection/collection.type";
  import { type INode, webNodeTypeList } from "../node.type";
  import { resolveNodeIcon } from "../node.utils";
  import NodeFavicon from "./NodeFavicon.svelte";
  export let types: ICollectionExpanded[] | undefined = undefined;
  export let node: INode | undefined = undefined;
  export let size: Size.sm | Size.md | Size.lg | number = Size.md;
  let avatars: IAvatar[] | undefined = undefined;
  let baseAvatars: IAvatar[] | undefined = undefined;
  let _avatars: IAvatar[] | undefined = undefined;

  $: if (types && types.length > 0) {
    resolveAvatars();
  } else if (types?.length === 0) {
    _avatars = [];
  }

  async function resolveAvatars() {
    avatars = types?.flatMap((x) => [x.avatar]).filter((a) => a) as IAvatar[];
    baseAvatars = types
      ?.flatMap((x) => [x.typeToExtend?.avatar])
      .filter((a) => a) as IAvatar[];
    if (baseAvatars.length > 0) {
      _avatars = baseAvatars;
    } else {
      _avatars = avatars;
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
{/if}
{#if node && webNodeTypeList.includes(node.contentType)}
  <NodeFavicon {node} {size} />
{:else if node}
  <Icon icon={resolveNodeIcon(node.contentType)} {size} />
{/if}
