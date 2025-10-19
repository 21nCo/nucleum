<script lang="ts">
  import AvatarRenderer from "@21n/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { CollectionType, type ICollectionThumb } from "@21n/components/collection/collection.type";
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
