<script lang="ts">
  import { CurationType } from "$lib/client/types/memotron/curation.type";
  import { onMount } from "svelte";
  import {
    determineCurationType,
    type IActiveCollectionStore,
    resolveActiveCollectionStore
  } from "../collection/collection.store";
  import Collection from "../collection/Collection.svelte";
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
