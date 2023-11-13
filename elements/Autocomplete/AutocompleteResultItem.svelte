<script lang="ts">
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { createEventDispatcher } from "svelte";

  export let style: string;
  export let label: string;
  export let id: string;
  export let isActive: boolean = false;
  export let isSelected: boolean = false;
  export let classList: ClassListProp = {
    active: "",
    inactive: "",
    common: "bg-bgs2 hover:bg-bgs3",
    selected: "",
  };

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch("click", { label, id });
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleClick();
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
{#if label && id}
  <div
    tabindex="0"
    {style}
    on:click={handleClick}
    on:keydown={handleKeyDown}
    class={`cursor-pointer text-b3 py-2 px-2.5  ${classList.common} ${
      isSelected
        ? classList.selected
        : isActive
        ? `${classList.active}`
        : classList.inactive
    }`}
  >
    {label}
  </div>
{/if}
