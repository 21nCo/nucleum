<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  export let value: number;
  export let showJustAvailability: boolean = false;
</script>

{#if showJustAvailability}
  <Icon icon="ph:check" class="text-ags1" />
{:else if value >= 0 && value <= 0.2}
  <span class="text-ars1">Negative</span>
{:else if value > 0.2 && value <= 0.6}
  <span class="flex items-center gap-1 text-yellow-500">
    <Icon icon="ph:thumbs-up" class="text-yellow-500" />
    <span> Okay </span>
  </span>
{:else}
  <span class="flex items-center gap-1 text-ags1">
    <Icon icon="ph:heart" class="text-ags1" />
    <span> Great </span>
  </span>
{/if}
