<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import CustomColorPropagator from "../style/CustomColorPropagator.svelte";
  import ColorPickerPopover from "./ColorPickerPopover.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let hue: number;
  export let changeCallback: (value: number | string) => void;
  export let onDebouncedChangeCallback: (value: number | string) => void;
  export let width: string | undefined = undefined;
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

<CustomColorPropagator color={hue}>
  <div
    class={cn(
      "flex items-center justify-center border border-brs3 bg-ccs1",
      width,
      {
        "w-8 h-8 rounded-full": !width,
        "rounded-md h-full": width
      }
    )}
    use:popover={{
      content: ColorPickerPopover,
      componentProps: {
        hue,
        onChangeCallback: onChange,
        onDebouncedChangeCallback,
        isShowPreview: false
      }
    }}
  >
    <Icon icon="ph:paint-brush-light" class="text-cbg" size={Size.sm} />
  </div>
</CustomColorPropagator>
