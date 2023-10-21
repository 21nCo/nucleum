<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Cross from "../icons/Cross.svelte";
  import Dustbin from "../icons/Dustbin.svelte";
  import { IconVariant } from "../types/icon.type";
  import Icon from "./Icon.svelte";
  import { pointronEvents } from "$lib/local/stores/local.store";
  import type { PointronEvent } from "$lib/local/types/pointronEvent.type";
  import { PointronEventEnum } from "$lib/local/types/pointronEvent.enum";
  import { actIfClickedOutside } from "$lib/local/utils/local.utils";
  import { generateUID } from "../utils/utils";

  export let isVisible: boolean = false;
  export let hideCloseButton: boolean = false;
  export let hideHeader: boolean = false;

  export let title: string = "";

  export let classList: string = "";
  export let style: string = "";

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch("close");
  }
</script>

<div
  {style}
  class={`bg-bgs3 px-4 absolute py-6 rounded-sm transition-all motion-reduce:transition-none motion-reduce:hover:transition-none ${classList} ${
    isVisible ? "opacity-1 scale-1 z-100" : "opacity-0 scale-[0.95] -z-10"
  }`}
>
  {#if !hideHeader}
    <div
      class={`flex justify-between ${!title && hideCloseButton ? `` : `mb-4`}`}
    >
      {#if title}
        <span class="text-fgs1 text-base">{title}</span>
      {/if}
      {#if !hideCloseButton}
        <Icon on:click={handleClose} icon="cross" variant={IconVariant.Solid} />
      {/if}
    </div>
  {/if}
  <slot />
</div>

<!-- Note: In order to get the desired placement, make the parent(where ever necessary) position:relative, -->
