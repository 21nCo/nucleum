<script lang="ts">
  import { InputStyle, type InputLabel } from "../types/input.type";
  import { cn } from "../utils/ui.utils";
  import FormControlLabelWrapper from "./text/formLabel/FormControlLabelWrapper.svelte";
  let classList = "";
  export { classList as class };
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let isActive: boolean = false;
</script>

<FormControlLabelWrapper props={label}>
  <button
    class={cn("flex w-full items-center rounded-md", classList, {
      "p-2": style != InputStyle.PLAIN,
      "border border-brs3": style === InputStyle.BORDERED && !isActive,
      "border border-aps1":
        isActive &&
        (style === InputStyle.BORDERED || style === InputStyle.FILLED),
      "bg-bgs2": style === InputStyle.FILLED,
      "border border-bgs2 ": style === InputStyle.FILLED && !isActive
    })}
    on:click
  >
    <slot />
  </button>
</FormControlLabelWrapper>
