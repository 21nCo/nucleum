<script lang="ts">
  import type { DynamicIconProp } from "$lib/local/types/dynamicIconProp.type";
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import Icon from "../Icon.svelte";

  export let style: string = "";
  export let classList: ClassListProp | null = null;

  export let label: string = "";
  export let icon: DynamicIconProp | null = null;
  export let isActive: boolean = false;

  const dispatch = createEventDispatcher();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      dispatch("click");
    }
  }
  $: {
    console.log({ icon });
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  on:click|stopPropagation
  on:keydown={() => {}}
  {style}
  class={`cursor-pointer w-full text-b3 py-2 px-4 hover:bg-bgs3 hover:bg-opacity-50 ${
    classList?.common
  } ${
    isActive
      ? `bg-bgs3 bg-opacity-50 ${classList?.active}`
      : classList?.inactive
  }`}
>
  <div class="whitespace-nowrap flex items-center justify-start">
    <!-- {#if icon}
      <div class="min-w-[1rem] mr-2 flex justify-center items-center w-4 h-4">
        <Icon icon={icon.name} variant={icon.variant} />
      </div>
    {/if} -->
    <span>
      {label}
    </span>
  </div>
  <slot />
</div>
