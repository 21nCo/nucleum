<script lang="ts">
  import view from "@21n/stores/view.store";
  import { Orientation } from "@21n/types/direction.enum";
  import type { InputLabel } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  export let props: InputLabel | undefined = undefined;
  export let size: Size.md | Size.sm = Size.md;
</script>

<div
  class={cn("relative flex", {
    "flex-col":
      props?.orientation === Orientation.Vertical ||
      (!props?.orientation && $view.isPortrait),
    "gap-2":
      (props?.orientation === Orientation.Vertical ||
        (!props?.orientation && $view.isPortrait)) &&
      size === Size.md,
    "gap-1.5":
      (props?.orientation === Orientation.Vertical ||
        (!props?.orientation && $view.isPortrait)) &&
      size === Size.sm,
    "flex-row flex-wrap items-center gap-2":
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
