<script lang="ts">
  import { view } from "$lib/tidy/stores/app.store";
  import { CellVariant } from "$lib/tidy/types/cellVariant.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import Icon from "../Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import type { TableColumnItem } from "$lib/tidy/types/tableCell.type";

  export let variant: CellVariant = CellVariant.ROW;
  export let icon: string = "";
  export let action: (...args: any[]) => any = () => {}; // this is basically the event name, which will be dispatched
  export let width: string = "";
  export let rowId: string = "";

  let classList = "";

  const dispatch = createEventDispatcher();

  $: classList = (() => {
    if ($view.isPortrait) {
      switch (variant) {
        case CellVariant.COLUMN:
          return `text-fgs1 text-b2`;
        case CellVariant.ROW:
          return `text-fgs2 text-b3`;
        default:
          return "text-fgs2 text-b3";
      }
    } else {
      switch (variant) {
        case CellVariant.COLUMN:
          return `text-fgs1 text-base`;
        case CellVariant.ROW:
          return `text-fgs2 text-b2`;
        default:
          return "text-fgs2 text-b2";
      }
    }
  })();

  function handleClick() {
    if (action) {
      action(rowId);
    }
  }

  onMount(() => {
    if (!width) {
      console.log("This should not run atleast for one of these", variant);
      width = `w-full ${$view.isPortrait ? "min-w-[4rem]" : "min-w-[9rem]"}`;
    }
  });
</script>

<div class={`${classList} ${width}`}>
  {#if icon}
    <Icon {icon} size={Size.md} on:click={handleClick} />
  {/if}
  <slot />
</div>
