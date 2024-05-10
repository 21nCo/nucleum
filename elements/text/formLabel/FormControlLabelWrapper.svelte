<script lang="ts">
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import type { InputLabel } from "$lib/tidy/types/input.type";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import FormControlLabel from "./FormControlLabel.svelte";
  export let props: InputLabel | undefined = undefined;
</script>

<div
  class={cn("relative flex w-full", {
    "flex-col gap-2": props?.orientation === Orientation.Vertical,
    "flex-row justify-between items-center":
      props?.orientation === Orientation.Horizontal
  })}
>
  {#if props?.label}
    <FormControlLabel {props} />
  {/if}
  <slot />
</div>
