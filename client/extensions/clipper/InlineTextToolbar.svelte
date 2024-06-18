<script lang="ts">
  import cssText from "data-text:~style.css";
  import { createEventDispatcher } from "svelte";
  import HightlightColorItem from "./HightlightColorItem.svelte";
  const dispatch = createEventDispatcher();
  export let colors: string[];
  export let selectedColor: string | null = null;
  export let isExistingClip: boolean = false;
  export const getStyle = () => {
    const style = document.createElement("style");
    style.textContent = cssText;
    return style;
  };
  // $: console.log({ colors, selectedColor, isExistingClip });
</script>

<div
  style="width: 200px; height: 40px; background-color: #ffffff; border-radius: 4px; padding: 1p 4px; display: inline-flex; gap: 6px; justify-content: center; align-items: center;"
>
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
  {#if isExistingClip}
    <span>delete</span>
  {/if}
</div>
