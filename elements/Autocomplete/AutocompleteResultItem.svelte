<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let classList: string = "";
  export let style: string;
  export let activeClassList: string = "";
  export let title: string;
  export let id: string;
  export let isActive: boolean = false;

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch("click", { title, id });
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleClick();
    }
  }
</script>

{#if title && id}
  <div
    {style}
    on:click={handleClick}
    on:keydown={handleKeyDown}
    class={`cursor-pointer text-b3 bg-bgs2 hover:bg-bgs3 py-2 px-2.5 ${classList} ${
      isActive ? `${activeClassList}` : ``
    }`}
  >
    {title}
  </div>
{/if}
