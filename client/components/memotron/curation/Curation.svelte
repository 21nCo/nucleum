<script lang="ts">
  import {
    resolveActiveCurationStore,
    type ActiveCurationStoreType
  } from "./curation.store";
  import { CurationType } from "$lib/client/types/memotron/curation.type";
  import Collection from "./collection/Collection.svelte";
  export let id: string;
  let curation: ActiveCurationStoreType;
  $: if (id) {
    curation = resolveActiveCurationStore(id);
    curation.init(id);
  }
</script>

<div class="grow h-full flex justify-center items-center">
  {#if $curation && $curation.type === CurationType.COMBINATION}
    <!-- TODO -->
    <div
      class="w-full h-full flex justify-center items-center text-fgs4 text-b3"
    >
      {id}
    </div>
  {:else}
    <Collection {id} on:back />
  {/if}
</div>
