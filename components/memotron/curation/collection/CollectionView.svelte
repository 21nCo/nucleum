<script lang="ts">
  import { CurationType } from "$lib/tidy/types/memotron/curation.type";
  import { resolveActiveCurationStore } from "../curation.store";
  import CollectionContent from "./CollectionContent.svelte";
  import Cover from "./Cover.svelte";
  import CollectionTitleBar from "./CollectionTitleBar.svelte";
  export let id: string;
  $: collection = resolveActiveCurationStore(id);
  $: console.log("CollectionView", $collection);
</script>

{#if $collection}
  <div class="flex flex-col gap-6 h-full w-full">
    {#if $collection.type != CurationType.NODELINKS}
      <div class="flex flex-col">
        <Cover src="" />
        <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present -->
        <!-- TODO - back button to previous resource - if launched from a mention or links -->
        <CollectionTitleBar on:back {id} />
      </div>
    {:else}
      <CollectionTitleBar on:back {id} />
    {/if}
    <CollectionContent {id} />
  </div>
{/if}
