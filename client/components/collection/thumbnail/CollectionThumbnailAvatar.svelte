<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { CollectionType, type ICollectionThumb } from "../collection.type";
  export let item: ICollectionThumb;
  export let isShowFallbackIcons: boolean = false;
  export let size: Size.sm | Size.md | Size.lg = Size.sm;
</script>

{#if item.type === CollectionType.TYPED && (item.avatar || item.typeToExtend?.avatar)}
  <AvatarRenderer avatar={item.avatar ?? item.typeToExtend?.avatar} {size} />
{:else if item.type === CollectionType.QUERY}
  <Icon icon="at-symbol" {size} />
{:else if isShowFallbackIcons}
  <Icon icon="ph:circles-four" {size} />
{/if}
