<script lang="ts">
  import { page } from "$app/stores";
  import { CurationType } from "$lib/client/types/memotron/curation.type";
  import EditModeToggle from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { createEventDispatcher } from "svelte";
  import { resolveActiveCurationStore } from "../curation.store";
  const dispatch = createEventDispatcher();
  export let id: string;
  $: collection = resolveActiveCurationStore(id);
  $: bilinksRenderedAlongWithNode = $page.url.searchParams.get("blr");
</script>

<div class="w-full flex justify-between items-center">
  {#if $collection.type === CurationType.NODELINKS}
    {#if bilinksRenderedAlongWithNode}
      <span class="text-h4">Links</span>
    {:else}
      <div class="flex flex-col items-start gap-1">
        <button
          class="text-base text-aps1"
          on:click={() => {
            dispatch("back");
          }}>{$collection.label}</button
        >
        <span>Links</span>
      </div>
    {/if}
  {:else}
    <!-- TODO breadcrumbs - if launched as child from a combination i.e. if parent present -->
    <!-- TODO - back button to previous resource - if launched from a mention or links -->
    <span class="font-bold text-h1">
      {$collection.label}
    </span>
  {/if}
  <EditModeToggle />
</div>
