<script lang="ts">
  import type { ClassListProp } from "$lib/tidy/types/classListProp.type";
  import { createEventDispatcher } from "svelte";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";

  export let style: string = "";
  export let classList: ClassListProp | null = null;

  export let label: string = "";
  export let icon: string | undefined = undefined;
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
    {#if icon}
      <div class="min-w-[1rem] mr-2 flex justify-center items-center">
        <Icon {icon} size={Size.sm} />
      </div>
    {/if}
    <span>
      {label}
    </span>
  </div>
  <slot />
</div>
