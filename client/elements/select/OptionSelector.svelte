<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import OptionSelectorItem from "./OptionSelectorItem.svelte";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import {
    OptionSelectorStyle,
    type ISelectItem,
    type ISelectValue
  } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { InputLabel } from "$lib/client/types/input.type";
  const dispatch = createEventDispatcher();
  export let options: ISelectItem[];
  export let labelProps: InputLabel | undefined = undefined;
  export let selected: ISelectValue | undefined = undefined;
  export let parentBackgroundIndex: number = 1;
  export let size: Size.lg | Size.md | Size.sm = Size.md;
  export let style: OptionSelectorStyle = OptionSelectorStyle.OUTLINE;
  export let iconOrientation: Orientation = Orientation.Horizontal;
  export let isPreventWrap: boolean = false;
  let classList: string = "flex w-full";
  if (selected === undefined) selected = options[0]?.value;
</script>

<FormControlLabelWrapper props={labelProps}
  ><div
    class={cn({
      "relative w-full": labelProps?.orientation === Orientation.Vertical,
      "max-w-[16rem] grow": labelProps?.orientation === Orientation.Horizontal
    })}
  >
    <div
      class={cn(classList, {
        "rounded-md": style === OptionSelectorStyle.TRAIN,
        "border border-brs3": style === OptionSelectorStyle.TRAIN,
        "flex-wrap overflow-y-auto":
          style === OptionSelectorStyle.OUTLINE && !isPreventWrap,
        "gap-6": style === OptionSelectorStyle.OUTLINE && size === Size.lg,
        "gap-4": style === OptionSelectorStyle.OUTLINE && size === Size.md,
        "gap-2": style === OptionSelectorStyle.OUTLINE && size === Size.sm,
        grow: style === OptionSelectorStyle.CHECK_CIRCLE,
        "justify-start gap-8":
          style === OptionSelectorStyle.CHECK_CIRCLE &&
          labelProps?.orientation === Orientation.Vertical,
        "justify-around gap-2":
          style === OptionSelectorStyle.CHECK_CIRCLE &&
          labelProps?.orientation === Orientation.Horizontal
      })}
    >
      {#each options as item, index}
        <OptionSelectorItem
          {item}
          {size}
          {style}
          {iconOrientation}
          isActive={selected === item.value}
          on:click={() => {
            if (item.isDisabled) return;
            selected = item.value;
            dispatch("select", item.value);
          }}
        />
      {/each}
    </div>
  </div></FormControlLabelWrapper
>
