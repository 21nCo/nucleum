<script lang="ts">
  import { ChipVariant } from "$lib/client/types/chipVariant.enum";
  import Icon from "../Icon.svelte";
  export let hideCloseIcon: boolean = false;
  export let variant: ChipVariant;

  function getClassesBasedOnVariant() {
    switch (variant) {
      case ChipVariant.OUTLINED:
        return "border border-brs3 rounded-md text-fgs1";
      case ChipVariant.FILLED:
        return "bg-bgs3 hover:bg-bgs3";
      default:
        return "bg-bgs3 hover:bg-bgs3";
    }
  }
</script>

<div
  class={`py-1 px-3 gap-1 flex items-center text-fgs2 ${getClassesBasedOnVariant()}`}
>
  <slot />
  {#if !hideCloseIcon}
    <Icon on:click icon="cross" />
  {/if}
</div>
