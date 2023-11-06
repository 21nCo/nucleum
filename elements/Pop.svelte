<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { IconVariant } from "../types/icon.type";
  import Icon from "./Icon.svelte";
  import { generateUID } from "../utils/utils";
  import { Size } from "../types/size.enum";

  export let isVisible: boolean = false;
  export let hideCloseButton: boolean = false;
  export let hideHeader: boolean = false;
  export let size: Size = Size.md;

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
  class={`bg-bgs3  absolute transition-all motion-reduce:transition-none motion-reduce:hover:transition-none ${
    size === Size.lg
      ? `px-4 py-6 rounded-lg`
      : size === Size.md
      ? `px-3 py-4 rounded-md`
      : `px-2 py-2 rounded-sm`
  } ${classList} ${
    isVisible ? "visible scale-1 z-20" : "hidden scale-[0.95] -z-10"
  }`}
>
  {#if !hideHeader && (title || !hideCloseButton)}
    <div
      class={`flex justify-between ${!title && hideCloseButton ? `` : `mb-4`}`}
    >
      {#if title}
        <span
          class={`text-fgs1 ${
            size === Size.lg
              ? ` text-base`
              : size === Size.md
              ? ` text-b2`
              : ` text-b3`
          }`}>{title}</span
        >
      {/if}
      {#if !hideCloseButton}
        <Icon on:click={handleClose} icon="cross" variant={IconVariant.Solid} />
      {/if}
    </div>
  {/if}
  <slot />
</div>

<!-- Note: In order to get the desired placement, make the parent(where ever necessary) position:relative, -->
