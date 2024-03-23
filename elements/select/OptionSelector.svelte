<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import {
    OptionSelectorStyle,
    type SwitchItem
  } from "$lib/tidy/types/switcher.enum";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import OptionSelectorItem from "./OptionSelectorItem.svelte";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  const dispatch = createEventDispatcher();
  export let items: SwitchItem[];
  export let label: string = "";
  export let selected: string | undefined = undefined;
  export let parentBackgroundIndex: number = 1;
  export let size: Size = Size.md;
  export let style: OptionSelectorStyle = OptionSelectorStyle.TRAIN;
  export let iconOrientation: Orientation = Orientation.Horizontal;
  export let labelOrientation: Orientation = Orientation.Vertical;
  export let info: FormLabelInfoTooltip | undefined = undefined;
  let classList: string = " flex w-full ";
  onMount(() => {
    if (selected === undefined) selected = items[0].label;
    switch (style) {
      case OptionSelectorStyle.TRAIN:
        classList += " rounded-md "; //+
        //bgClass($userPreferences.theme, parentBackgroundIndex);
        if (size != Size.sm) {
          classList += " border-2 border-brs3 ";
        }
        break;
      case OptionSelectorStyle.OUTLINE:
        if (size === Size.md) {
          classList += "gap-4 overflow-auto";
        } else if (size === Size.sm) {
          classList += "gap-2 overflow-auto";
        }
        break;
      case OptionSelectorStyle.CHECK_CIRCLE:
        classList += " justify-around grow gap-2 ";
        break;
      default:
        classList += " items-center";
        break;
    }
  });
</script>

<FormControlLabelWrapper {label} {info} orientation={labelOrientation}
  ><div
    class={labelOrientation === Orientation.Horizontal
      ? "max-w-[16rem] grow"
      : "relative w-full"}
  >
    <div class={classList}>
      {#each items as item, index}
        <OptionSelectorItem
          {item}
          {size}
          {style}
          {iconOrientation}
          isActive={selected === item.label}
          on:click={() => {
            if (item.isDisabled) return;
            selected = item.label;
            dispatch("switch", item);
          }}
        />
      {/each}
    </div>
  </div></FormControlLabelWrapper
>
