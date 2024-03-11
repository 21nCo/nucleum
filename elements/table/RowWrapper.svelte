<script lang="ts">
  import { view } from "$lib/tidy/stores/app.store";
  import { CellVariant } from "$lib/tidy/types/cellVariant.enum";
  import { onMount } from "svelte";

  export let variant: CellVariant = CellVariant.ROW;

  let classList: string = "";
  export let width: string = "";

  $: {
    classList = (() => {
      //   if ($windowObject.isInPortraitMode) {
      //     switch (variant) {
      //       case CellVariant.COLUMN:
      //         return `text-fgs1 text-b3`;
      //       case CellVariant.ROW:
      //         return `text-fgs2 text-b5`;
      //       default:
      //         return "text-fgs1 text-b3";
      //     }
      //   } else {
      switch (variant) {
        case CellVariant.COLUMN:
          return `bg-bgs2 w-fit`;
        case CellVariant.ROW:
          return `bg-bgs1 w-fit`;
        default:
          return "bg-bgs1 w-fit";
      }
      //   }
    })();
  }
</script>

<div
  class={`flex ${
    $view.isPortrait ? `py-2.5 px-4` : `py-3 px-4`
  } ${classList} ${width}`}
>
  <slot />
</div>
