<script lang="ts">
  import type { FormLabelInfoTooltip } from "$lib/tidy/types/text.type";
  import FormLabelTooltip from "./FormLabelTooltip.svelte";
  export let label: string;
  export let info: FormLabelInfoTooltip | undefined = undefined;
  export let isRequired: boolean = false;
  export let forId: string = "";
</script>

<label class="flex gap-2 items-center" for={forId}>
  <div class="text-fgs2 min-w-fit text-left">{label}</div>
  {#if info && info.body}
    <FormLabelTooltip {info} />
  {/if}
  {#if isRequired}
    <div class="text-ars1">*</div>
  {/if}
</label>
