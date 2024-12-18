<script lang="ts">
  import { Orientation } from "../types/direction.enum";
  import { InputStyle, type InputLabel } from "../types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import FormControlLabelWrapper from "./text/formLabel/FormControlLabelWrapper.svelte";
  import { Size } from "../types/size.enum";
  let classList = "";
  export { classList as class };
  export let style: InputStyle = InputStyle.BORDERED;
  export let size: Size.md | Size.sm = Size.md;
  export let label: InputLabel | undefined = undefined;
  export let isFocused: boolean = false;
</script>

<FormControlLabelWrapper props={label} {size}>
  <div
    class={cn("flex items-center gap-1 rounded-md", classList, {
      "w-full":
        (label?.orientation === Orientation.Vertical && !label?.isShrink) ||
        !label?.label,
      "text-b2": style != InputStyle.PLAIN && size === Size.sm,
      "border border-brs3": style === InputStyle.BORDERED && !isFocused,
      "border border-aps1":
        isFocused &&
        (style === InputStyle.BORDERED || style === InputStyle.FILLED),
      "bg-bgs2": style === InputStyle.FILLED,
      "border border-bgs2 ": style === InputStyle.FILLED && !isFocused
    })}
  >
    <slot />
  </div>
</FormControlLabelWrapper>
