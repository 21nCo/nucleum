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
  let size: Size = Size.md;
  $: size = setSize(accessPoint, isExpandedContext);

  function hasResolvedTypes(
    node: INode | IActiveNode
  ): node is IActiveNode & { types: NonNullable<IActiveNode["types"]> } {
    return "types" in node && Array.isArray(node.types) && node.types.length > 0;
  }

  function hasCollections(
    node: INode | IActiveNode
  ): node is IActiveNode & {
    collections: NonNullable<IActiveNode["collections"]>;
  } {
    return (
      "collections" in node &&
      Array.isArray(node.collections) &&
      node.collections.length > 0
    );
  }

  function hasAvatarFile(avatar: IAvatar): avatar is IAvatar & { file: string } {
    return "file" in avatar && typeof avatar.file === "string";
  }

  function resolveIconSize(
    accessPoint: ResourceAccessPoint,
    isExpandedContext: boolean
  ): Size.sm | Size.md | Size.lg {
    if (accessPoint === ResourceAccessPoint.SELF && isExpandedContext) {
      return Size.lg;
    }
    return accessPoint === ResourceAccessPoint.MARKDOWN_MENTION ? Size.sm : Size.md;
  }

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
        if (isExpandedContext) return Size.lg;
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
      } else if (hasResolvedTypes(node)) {
        _avatars = resolveAvatar(node.types);
      } else if (hasCollections(node)) {
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

{#if _avatars && _avatars.length > 0 && !hasAvatarFile(_avatars[0])}
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
  <NodeFavicon node={node} size={resolveIconSize(accessPoint, isExpandedContext)} />
{:else if node && node.contentType === NodeType.FILE && accessPoint !== ResourceAccessPoint.SEARCH_RESULT}
  <Icon
    icon={
      node.file && typeof node.file === "object"
        ? resolveFileIcon(node.file)
        : "file"
    }
    size={resolveIconSize(accessPoint, isExpandedContext)}
  />
{:else if node && node.contentType}
  <Icon
    icon={resolveNodeIcon(node.contentType)}
    size={resolveIconSize(accessPoint, isExpandedContext)}
  />
{/if}

{#if node && !node.avatar && !hasResolvedTypes(node)}
  <ComponentBaseLayer
    subscribeToCacheUpdate={[CacheKey.TYPED_COLLECTION_CACHE]}
    on:change={refreshAvatar}
  />
{/if}
