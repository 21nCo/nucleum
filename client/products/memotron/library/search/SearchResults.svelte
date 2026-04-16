<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import LinkSearchResultItem from "@21n/products/memotron/common/linkbox/LinkSearchResultItem.svelte";
  let { items = [] }: { items?: any[] } = $props();
  function onClick(e: MouseEvent, item: any) {
    appStore.resourceClickHandler(e, item.id);
  }
</script>

<div class="flex flex-col w-full px-3">
  {#each items as item}
    <LinkSearchResultItem {item} onClick={(e) => onClick(e, item)} />
  {/each}
</div>
