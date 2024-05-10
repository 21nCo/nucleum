<script lang="ts">
  import type { InputLabel } from "$lib/tidy/types/input.type";
  import FormLabelTooltip from "./FormLabelTooltip.svelte";
  export let props: InputLabel;
  export let forId: string = "";
</script>

<label class="flex gap-2 items-center" for={forId}>
  <div class="text-fgs2 min-w-fit text-left">{props.label}</div>
  {#if props.tooltip && props.tooltip.body}
    <FormLabelTooltip info={props.tooltip} />
  {/if}
  {#if props.isMarkRequired}
    <div class="text-ars1">*</div>
  {/if}
</label>
