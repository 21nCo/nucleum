<script lang="ts">
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import { appStore } from "$lib/client/stores/app.store";
  import LinkSuggestionItem from "../../common/linkbox/LinkSuggestionItem.svelte";
  export let items: any[] = [];
  $: console.log({ items });
  function onClick(e: MouseEvent, item: any) {
    appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP);
  }
</script>

<div class="flex flex-col gap-2 w-full">
  {#each items as item}
    <LinkSuggestionItem {item} on:click={(e) => onClick(e, item)} />
  {/each}
</div>
