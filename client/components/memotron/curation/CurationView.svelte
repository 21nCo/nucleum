<script lang="ts">
  import {
    resolveActiveCurationStore,
    type ActiveCurationStoreType
  } from "./curation.store";
  import { CurationType } from "$lib/client/types/memotron/curation.type";
  import CollectionView from "./collection/CollectionView.svelte";
  export let id: string;
  let curation: ActiveCurationStoreType;
  $: if (id) {
    curation = resolveActiveCurationStore(id);
    curation.init(id);
  }
</script>

<div class="grow h-full flex text-fgs3 justify-center items-center">
  {#if $curation && $curation.type === CurationType.COMBINATION}
    <!-- TODO -->
    <div
      class="w-full h-full flex justify-center items-center text-fgs4 text-b3"
    >
      {id}
    </div>
  {:else}
    <CollectionView {id} on:back />
  {/if}
</div>
