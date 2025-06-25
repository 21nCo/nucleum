<script lang="ts">
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { onMount } from "svelte";
  import SizeFactorSelector from "./SizeFactorSelector.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  export let parentBackgroundIndex: number = 1;
  let selectedFactor: number = 1;
  function onChange(event: any) {
    $userPreferences.accessibilitySizingFactor = Number(event.detail.factor);
  }
  onMount(() => {
    selectedFactor = $userPreferences.accessibilitySizingFactor;
  });
</script>

<div class="flex flex-col items-start gap-2">
  <div class="text-fgs2">Block sizing</div>
  <SizeFactorSelector
    on:change={onChange}
    {selectedFactor}
    {parentBackgroundIndex}
  />
</div>
