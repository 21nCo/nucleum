<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import OptionSelectorItem from "./OptionSelectorItem.svelte";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import {
    OptionSelectorStyle,
    type SelectItem
  } from "$lib/tidy/types/select.type";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import type { InputLabel } from "$lib/tidy/types/input.type";
  const dispatch = createEventDispatcher();
  export let options: SelectItem[];
  export let labelProps: InputLabel | undefined = undefined;
  /**
   * @deprecated - use label props instead
   */
  export let label: string = "";
  export let selected: string | undefined = undefined;
  export let parentBackgroundIndex: number = 1;
  export let size: Size = Size.md;
  export let style: OptionSelectorStyle = OptionSelectorStyle.OUTLINE;
  export let iconOrientation: Orientation = Orientation.Horizontal;
  /**
   * @deprecated - use label props instead
   */
  export let labelOrientation: Orientation = Orientation.Vertical;
  /**
   * @deprecated - use label props instead
   */
  export let info: FormLabelInfoTooltip | undefined = undefined;
  let classList: string = "flex w-full";
  if (selected === undefined) selected = options[0].value;
</script>

<FormControlLabelWrapper
  props={labelProps ?? { label, tooltip: info, orientation: labelOrientation }}
  ><div
    class={cn({
      "relative w-full": labelOrientation === Orientation.Vertical,
      "max-w-[16rem] grow": labelOrientation === Orientation.Horizontal
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
