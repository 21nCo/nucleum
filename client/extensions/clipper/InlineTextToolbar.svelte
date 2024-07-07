<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import HightlightColorItem from "./HightlightColorItem.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  const dispatch = createEventDispatcher();
  export let colors: string[];
  export let selectedColor: string | null = null;
  export let isExistingClip: boolean = false;
  // $: console.log({ colors, selectedColor, isExistingClip });
</script>

<div
  class="shadow-md border border-brs2 flex justify-center items-center rounded-md px-4 py-2 gap-3 bg-bgs1"
>
  <span class="flex gap-2 items-center">
    {#each colors as color}
      <HightlightColorItem
        {color}
        isActive={color === selectedColor}
        on:click={() => {
          // console.log(color);
          dispatch("color", color);
        }}
      />
    {/each}
  </span>
  <Button icon="document-text" />
  {#if isExistingClip}
    <Button icon="trash" />
  {/if}
</div>
