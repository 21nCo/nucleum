<script lang="ts">
  import { Orientation } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  import Switch from "@21n/elements/toggle/Switch.svelte";
  import InputBaseElement from "@21n/elements/InputBaseElement.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let label: InputLabel;
  export let style: InputStyle = InputStyle.PLAIN;
  export let checked: boolean = false;
  export let size: Size = Size.md;
  export let isExpanded: boolean = false;
  export let isDisabled: boolean = false;
  export let parentBgIndex: number = 1;
  if (!label.orientation) {
    label = {
      ...label,
      orientation: Orientation.Horizontal
    };
  }
</script>

{#if !isExpanded && (label.orientation === Orientation.Horizontal || !label.orientation)}
  <button
    class={cn("flex justify-center items-center min-w-32", {
      "gap-3": size === Size.sm,
      "gap-4": size === Size.md,
      "border border-brs3 rounded-full py-1": style === InputStyle.BORDERED
    })}
    on:click={() => {
      checked = !checked;
      dispatch("change", checked);
    }}
  >
    <Switch bind:on={checked} {size} on:change {isDisabled} />
    <FormControlLabel
      props={label}
      isCursorPointer={true}
      isWrapText={isExpanded}
    />
  </button>
{:else}
  <InputBaseElement {style} {label} {parentBgIndex}>
    <Switch bind:on={checked} {size} on:change {isDisabled} />
  </InputBaseElement>
{/if}
