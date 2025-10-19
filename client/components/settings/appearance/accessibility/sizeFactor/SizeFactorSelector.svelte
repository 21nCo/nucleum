<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import SizeFactorItem from "@21n/components/settings/appearance/accessibility/sizeFactor/SizeFactorItem.svelte";
  export let selectedFactor: number = 1;
  export let parentBackgroundIndex: number = 1;
  let dispatch = createEventDispatcher();
</script>

<div class="flex gap-4 flex-wrap">
  {#each [0, 1, 2] as factor, index (index)}
    <SizeFactorItem
      {factor}
      {parentBackgroundIndex}
      isActive={selectedFactor === factor}
      on:click={() => {
        selectedFactor = factor;
        dispatch("change", { factor });
      }}
    />
  {/each}
</div>
