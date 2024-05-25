<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { FormLabelInfoTooltip } from "$lib/client/types/text.type";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import FormControlLabel from "../text/formLabel/FormControlLabel.svelte";
  import Switch from "./Switch.svelte";
  import InputBaseElement from "../InputBaseElement.svelte";
  export let label: InputLabel;
  export let style: InputStyle = InputStyle.PLAIN;
  export let checked: boolean = false;
  /**
   * @deprecated
   */
  export let width: string | undefined = undefined;
  export let size: Size = Size.md;
  export let isExpanded: boolean = true;
  export let info: FormLabelInfoTooltip | undefined = undefined;
</script>

{#if (label.orientation === Orientation.Horizontal || !label.orientation) && !isExpanded}
  <div
    class={cn(
      "flex min-w-fit",
      {
        "gap-3": size === Size.sm,
        "gap-4": size === Size.md
      },
      width ? width : ""
    )}
  >
    <FormControlLabel props={label} />
    <Switch bind:on={checked} {size} />
  </div>
{:else}
  <InputBaseElement {style} {label}>
    <Switch bind:on={checked} {size} />
  </InputBaseElement>
{/if}
