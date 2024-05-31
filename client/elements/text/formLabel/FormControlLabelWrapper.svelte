<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { InputLabel } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import FormControlLabel from "./FormControlLabel.svelte";
  export let props: InputLabel | undefined = undefined;
  export let size: Size.md | Size.sm = Size.md;
</script>

<div
  class={cn("relative flex", {
    "flex-col":
      props?.orientation === Orientation.Vertical ||
      (!props?.orientation && $view.isPortrait),
    "gap-3":
      (props?.orientation === Orientation.Vertical ||
        (!props?.orientation && $view.isPortrait)) &&
      size === Size.md,
    "gap-2":
      (props?.orientation === Orientation.Vertical ||
        (!props?.orientation && $view.isPortrait)) &&
      size === Size.sm,
    "flex-row items-center gap-2":
      props?.orientation === Orientation.Horizontal ||
      (!props?.orientation && !$view.isPortrait),
    "text-b2": size === Size.sm,
    "w-full": !props?.isShrink,
    "justify-between":
      !props?.isShrink &&
      (props?.orientation === Orientation.Horizontal ||
        (!props?.orientation && !$view.isPortrait))
  })}
>
  {#if props?.label}
    <FormControlLabel {props} />
  {/if}
  <slot />
</div>
