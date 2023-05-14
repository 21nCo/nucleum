<script lang="ts">
  import InfoText from "./InfoText.svelte";
  export let label: string;
  export let info: string | undefined = undefined;
</script>

<div class="flex gap-2 items-center">
  <div class="text-fgs2">{label}</div>
  {#if info}
    <InfoText {info} />
  {/if}
</div>
