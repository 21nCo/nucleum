<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import ColorPickerPopover from "./ColorPickerPopover.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let hue: number;
  export let changeCallback: (value: number | string) => void;
  let saturation = 50;
  let lightness = 50;

  function onChange(
    value: number | string,
    additional?: {
      saturation?: number;
      lightness?: number;
    }
  ) {
    hue = +value;
    if (additional) {
      saturation = additional.saturation || 50;
      lightness = additional.lightness || 50;
    }
    dispatch("change", value);
    changeCallback?.(value);
  }
</script>

<div
  use:popover={{
    content: ColorPickerPopover,
    componentProps: {
      hue,
      onChangeCallback: onChange,
      isShowPreview: false
    }
  }}
>
  <div
    class="w-8 h-8 rounded-full"
    style="background-color:hsl({hue}, {saturation}%, {lightness}%);"
  ></div>
</div>
