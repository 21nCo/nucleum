<script lang="ts">
  import {
    determineCurationType,
    resolveActiveCollectionStore,
    type IActiveCollectionStore
  } from "./collection/collection.store";
  import { CurationType } from "$lib/client/types/memotron/curation.type";
  import Collection from "./collection/Collection.svelte";
  import { onMount } from "svelte";
  export let id: string;
  let collection: IActiveCollectionStore;
  let combination: any;
  let type: CurationType;
  onMount(async () => {
    console.log("curation onMount", { id });
    if (!id) return;
    type = determineCurationType(id);
    if (type === CurationType.COLLECTION)
      collection = resolveActiveCollectionStore(id);
    console.log({ type, collection });
  });
</script>

<div class="w-full h-full flex justify-center items-center">
  {#if $combination}
    <!-- TODO -->
    <div
      class="w-full h-full flex justify-center items-center text-fgs4 text-b3"
    >
      {id}
    </div>
  {:else if collection}
    <Collection {collection} on:back />
  {/if}
</div>
