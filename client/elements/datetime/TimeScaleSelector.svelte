<script lang="ts">
  import { TimeScale } from "@21n/types/time.type";
  import { enumToString } from "@21n/shared-utils/text.utils";
  import { createEventDispatcher } from "svelte";

  export let scales: TimeScale[];
  export let onSelect: (scale: TimeScale) => void;

  const dispatch = createEventDispatcher();

  function handleSelect(scale: TimeScale) {
    onSelect(scale);
    dispatch("hide");
  }
</script>

<div class="bg-bgs1 shadow-lg rounded-md p-2 border w-36">
  {#each scales as scale}
    <button
      class="block w-full text-left px-2 py-1 hover:bg-bgs2 rounded-md"
      on:click={() => handleSelect(scale)}
    >
      {enumToString(scale)}
    </button>
  {/each}
</div>
