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

<div class="w-full flex text-h3 justify-between items-center p-4">
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
    {$collection.label}
  {/if}
  <EditModeToggle />
</div>
