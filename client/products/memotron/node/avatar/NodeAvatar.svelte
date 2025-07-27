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
  import { cache } from "$lib/client/layout/layers/cache/cache.store";
  import { CacheKey } from "$lib/client/layout/layers/cache/cache.type";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { isValidAvatar } from "$lib/client/elements/avatarPicker/avatar.utils";
  export let node: INode | IActiveNode | undefined = undefined;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let isExpandedContext: boolean = false;
  let _avatars: IAvatar[] | undefined = undefined;
  $: size = setSize(accessPoint, isExpandedContext);

  onMount(() => {
    refreshAvatar();
  });

  function setSize(
    accessPoint: ResourceAccessPoint,
    isExpandedContext: boolean
  ) {
    switch (accessPoint) {
      case ResourceAccessPoint.MARKDOWN_MENTION:
        return Size.xs;
      case ResourceAccessPoint.SELF:
        if (isExpandedContext) return 40;
        return Size.md;
      default:
        return Size.sm;
    }
  }
  function refreshAvatar() {
    try {
      if (!node) return;
      if (node.avatar) {
        _avatars = node.avatar;
      } else if (node.types) {
        _avatars = resolveAvatar(node.types);
      } else if (node.collections) {
        const typedCollections = cache.retrieve(
          CacheKey.TYPED_COLLECTION_CACHE
        );
        if (!typedCollections) return;
        const types = typedCollections.filter((x: any) =>
          node.collections.some(resourceInList(x.id))
        );
        _avatars = resolveAvatar(types);
      }
      _avatars =
        typeof _avatars === "object"
          ? _avatars?.filter(Boolean)?.filter(isValidAvatar)
          : [];
    } catch (e) {
      logger.error({ at: "NodeAvatar - refreshAvatar", e });
    }
  }
</script>

{#if _avatars && _avatars.length > 0 && !_avatars[0].file}
  <span class="flex justify-center items-center">
    <!-- {#each _avatars as avatar, index (avatar)}
      <div
        class={cn("flex justify-center items-center", {
          "-ml-1": index !== 0
        })}
      >
        <AvatarRenderer {avatar} {size} />
      </div>
    {/each} -->
    <AvatarRenderer avatar={_avatars[0]} {size} />
  </span>
{:else if node && webNodeTypeList.includes(node.contentType)}
  <NodeFavicon {node} {size} />
{:else if node && node.contentType === NodeType.FILE && accessPoint !== ResourceAccessPoint.SEARCH_RESULT}
  <Icon icon={resolveFileIcon(node.file)} {size} />
{:else if node && node.contentType}
  <Icon icon={resolveNodeIcon(node.contentType)} {size} />
{/if}

{#if !node?.avatar && !node?.types}
  <ComponentBaseLayer
    subscribeToCacheUpdate={[CacheKey.TYPED_COLLECTION_CACHE]}
    on:change={refreshAvatar}
  />
{/if}
