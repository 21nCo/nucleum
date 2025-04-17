<script lang="ts">
  import type { InputLabel } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Badge from "../Badge.svelte";
  import FormLabelTooltip from "./FormLabelTooltip.svelte";
  export let props: InputLabel;
  export let forId: string = "";
  export let isCursorPointer: boolean = false;
  export let isWrapText: boolean = false;
</script>

<label
  class={cn("flex gap-2 items-center max-w-full", {
    "cursor-pointer": isCursorPointer
  })}
  for={forId}
>
  <div
    class={cn("text-fgs2 text-b2 min-w-fit whitespace-nowrap text-left", {
      "text-wrap": isWrapText
    })}
  >
    {props.label}
  </div>
  {#if props.tooltip && props.tooltip.body}
    <FormLabelTooltip info={props.tooltip} />
  {/if}
  {#if props.isMarkRequired}
    <div class="text-ars1">*</div>
  {/if}
  {#if props.badge}
    <Badge text={props.badge} size={Size.sm} />
  {/if}
</label>
