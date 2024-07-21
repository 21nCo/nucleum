<script lang="ts">
  import type { InputLabel } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import FormLabelTooltip from "./FormLabelTooltip.svelte";
  export let props: InputLabel;
  export let forId: string = "";
  export let isCursorPointer: boolean = false;
</script>

<label
  class={cn("flex gap-2 items-center", {
    "cursor-pointer": isCursorPointer
  })}
  for={forId}
>
  <div class="text-fgs2 text-b2 min-w-fit whitespace-nowrap text-left">
    {props.label}
  </div>
  {#if props.tooltip && props.tooltip.body}
    <FormLabelTooltip info={props.tooltip} />
  {/if}
  {#if props.isMarkRequired}
    <div class="text-ars1">*</div>
  {/if}
</label>
