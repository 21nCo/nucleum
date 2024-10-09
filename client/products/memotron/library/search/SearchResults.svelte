<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import LinkSuggestionItem from "../../common/linkbox/LinkSuggestionItem.svelte";
  export let items: any[] = [];
  function onClick(e: MouseEvent, item: any) {
    appStore.resourceClickHandler(e, item.id);
  }
</script>

<div class="flex flex-col w-full px-3">
  {#each items as item}
    <LinkSuggestionItem {item} on:click={(e) => onClick(e, item)} />
  {/each}
</div>
