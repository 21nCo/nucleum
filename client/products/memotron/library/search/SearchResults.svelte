<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import LinkSuggestionItem from "../../common/linkbox/LinkSuggestionItem.svelte";
  export let items: any[] = [];
  $: console.log({ items });
  function onClick(e: MouseEvent, item: any) {
    appStore.resourceClickHandler(e, item.id);
  }
</script>

<div class="flex flex-col w-full">
  {#each items as item}
    <LinkSuggestionItem {item} on:click={(e) => onClick(e, item)} />
  {/each}
</div>
