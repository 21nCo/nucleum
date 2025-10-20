<script lang="ts">
  import AvatarRenderer from "@21n/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import type { IAvatar } from "@21n/types/avatar.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { onMount } from "svelte";
  import {
    type IActiveNode,
    type INode,
    NodeType,
    webNodeTypeList
  } from "@21n/products/memotron/node/node.type";
  import { resolveFileIcon, resolveNodeIcon } from "@21n/products/memotron/node/node.utils";
  import NodeFavicon from "@21n/products/memotron/node/avatar/NodeFavicon.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { resolveAvatar } from "@21n/components/collection/collection.utils";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import { logger } from "@21n/components/debug/logger.client";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { isValidAvatar } from "@21n/elements/avatarPicker/avatar.utils";
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
