<script lang="ts">
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { onMount } from "svelte";
  export let id: string;
  let item: any;
  function resolveItem() {
    const dexie = $dataManager.cacheSource.dexie;
    if (id.includes("collection")) {
      return dexie.collection.get(id);
    } else if (id.includes("node")) {
      return dexie.node.get(id);
    }
  }
  onMount(async () => {
    item = await resolveItem();
  });
</script>

<button
  class="text-b2 whitespace-nowrap border border-brs2 rounded-full px-2 py-1"
  on:click
>
  {item?.label ?? ""}
</button>
