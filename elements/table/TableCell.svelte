<script lang="ts">
  import { windowObject } from "$lib/tidy/stores/app.store";
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
    if ($windowObject.isInPortraitMode) {
      switch (variant) {
        case CellVariant.COLUMN:
          return `text-fgs1 text-b3`;
        case CellVariant.ROW:
          return `text-fgs2 text-b5`;
        default:
          return "text-fgs2 text-b5";
      }
    } else {
      switch (variant) {
        case CellVariant.COLUMN:
          return `text-fgs1 text-b2`;
        case CellVariant.ROW:
          return `text-fgs2 text-b4`;
        default:
          return "text-fgs2 text-b4";
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
      width = `w-full ${
        $windowObject.isInPortraitMode ? "min-w-[4rem]" : "min-w-[9rem]"
      }`;
    }
  });
</script>

<div class={`${classList} ${width}`}>
  {#if icon}
    <Icon {icon} size={Size.sm} on:click={handleClick} />
  {/if}
  <slot />
</div>
