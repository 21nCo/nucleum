<script lang="ts">
  import type { InfoTextParams } from "$lib/tidy/types/text.type";
  import InfoText from "./InfoText.svelte";
  export let label: string;
  export let info: InfoTextParams | undefined = undefined;
  export let isRequired: boolean = false;
  export let forId: string = "";
</script>

<label class="flex gap-2 items-center" for={forId}>
  <div class="text-fgs2 min-w-fit text-left">{label}</div>
  {#if info && info.body}
    <InfoText {info} />
  {/if}
  {#if isRequired}
    <div class="text-ars1">*</div>
  {/if}
</label>
