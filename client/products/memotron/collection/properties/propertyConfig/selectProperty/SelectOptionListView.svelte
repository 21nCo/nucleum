<script lang="ts">
  import type { PropertyConfigOption } from "../../property.type";
  import SelectOptionItemView from "./SelectOptionItemView.svelte";
  export let options: PropertyConfigOption[];
  export let focusedOptionId: string | null = null;
</script>

{#each options as option, index (option.id)}
  <SelectOptionItemView
    {option}
    {index}
    isFocusing={option.id === focusedOptionId}
    on:remove
    on:default
    on:enter
  />
{/each}
