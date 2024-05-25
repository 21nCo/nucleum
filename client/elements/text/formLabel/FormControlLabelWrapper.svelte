<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { InputLabel } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import FormControlLabel from "./FormControlLabel.svelte";
  export let props: InputLabel | undefined = undefined;
</script>

<div
  class={cn("relative flex w-full", {
    "flex-col gap-2":
      props?.orientation === Orientation.Vertical ||
      (!props?.orientation && $view.isPortrait),
    "flex-row justify-between items-center":
      props?.orientation === Orientation.Horizontal ||
      (!props?.orientation && !$view.isPortrait)
  })}
>
  {#if props?.label}
    <FormControlLabel {props} />
  {/if}
  <slot />
</div>
