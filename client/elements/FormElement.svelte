<script lang="ts">
  import { Orientation } from "@21n/types/direction.enum";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import { bg, cn } from "@21n/utils/ui.utils";
  import FormControlLabelWrapper from "@21n/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Size } from "@21n/types/size.enum";
  let classList = "";
  export { classList as class };
  export let style: InputStyle = InputStyle.BORDERED;
  export let size: Size.md | Size.sm = Size.md;
  export let label: InputLabel | undefined = undefined;
  export let isFocused: boolean = false;
  export let parentBgIndex: number = 1;
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
      [bg(parentBgIndex)]: style === InputStyle.FILLED,
      "border border-bgs2 ": style === InputStyle.FILLED && !isFocused
    })}
  >
    <slot />
  </div>
</FormControlLabelWrapper>
