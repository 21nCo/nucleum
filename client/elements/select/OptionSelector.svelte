<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import OptionSelectorItem from "./OptionSelectorItem.svelte";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import {
    OptionSelectorStyle,
    type SelectItem
  } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { InputLabel } from "$lib/client/types/input.type";
  const dispatch = createEventDispatcher();
  export let options: SelectItem[];
  export let labelProps: InputLabel | undefined = undefined;
  export let selected: string | undefined = undefined;
  export let parentBackgroundIndex: number = 1;
  export let size: Size = Size.md;
  export let style: OptionSelectorStyle = OptionSelectorStyle.OUTLINE;
  export let iconOrientation: Orientation = Orientation.Horizontal;
  let classList: string = "flex w-full";
  if (selected === undefined) selected = options[0].value;
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
        "border border-brs3":
          style === OptionSelectorStyle.TRAIN && size != Size.sm,
        "flex-wrap overflow-y-auto": style === OptionSelectorStyle.OUTLINE,
        "gap-4": style === OptionSelectorStyle.OUTLINE && size === Size.md,
        "gap-2": style === OptionSelectorStyle.OUTLINE && size === Size.sm,
        "justify-around grow gap-2": style === OptionSelectorStyle.CHECK_CIRCLE
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
