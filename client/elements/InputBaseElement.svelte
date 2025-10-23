<script lang="ts">
  import { Orientation } from "@21n/types/direction.enum";
  import {
    InputStyle,
    type InputLabel,
    type PopoverInputOptions
  } from "@21n/types/input.type";
  import { bg, cn } from "@21n/utils/ui.utils";
  import Popover from "@21n/elements/popover/Popover.svelte";
  import FormControlLabelWrapper from "@21n/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Size } from "@21n/types/size.enum";
  let classList = "";
  export { classList as class };
  export let style: InputStyle = InputStyle.BORDERED;
  export let size: Size.md | Size.sm = Size.md;
  export let label: InputLabel | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let isFocused: boolean = false;
  export let popoverOptions: PopoverInputOptions | undefined = undefined;
  let popoverRef: any;
  let isOptionsVisible: boolean = false;
  /**
   * Read-only property to check if the input is active.
   */
  export let isActive: boolean = false;
  $: isActive = isFocused || isOptionsVisible;

  export function showPopover() {
    if (popoverRef) popoverRef.show();
  }
  export function hidePopover() {
    if (popoverRef) popoverRef.hide();
  }
</script>

<FormControlLabelWrapper props={label} {size}>
  <Popover
    bind:this={popoverRef}
    on:show
    isPreventDefault={!popoverOptions || popoverOptions.isPreventDefault}
    options={popoverOptions}
    isPreventDefaultStyling={popoverOptions?.isPreventDefaultStyling}
    bind:isPopoverVisible={isOptionsVisible}
    triggerClass={cn("flex items-center gap-1 rounded-md", classList, {
      "w-full":
        (label?.orientation === Orientation.Vertical && !label?.isShrink) ||
        !label?.label,
      "p-2": style != InputStyle.PLAIN && size === Size.md,
      "px-1.5 py-1 text-b2": style != InputStyle.PLAIN && size === Size.sm,
      "border border-brs3": style === InputStyle.BORDERED && !isActive,
      "border border-aps1":
        isActive &&
        (style === InputStyle.BORDERED || style === InputStyle.FILLED),
      [bg(parentBgIndex)]: style === InputStyle.FILLED,
      "border border-bgs2 ": style === InputStyle.FILLED && !isActive
    })}
  >
    <slot>Input element</slot>
    <slot slot="popover" name="popover">
      <slot name="popover">popover content</slot>
    </slot>
  </Popover>
</FormControlLabelWrapper>
