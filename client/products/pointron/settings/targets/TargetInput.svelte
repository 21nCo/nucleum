<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import type { TimeScale } from "$lib/client/types/time.type";
  import { getCorrespoingHorizonFrequencyLabel } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  export let item: TimeScale;
  let value: number;
  function onInput(event: any) {
    console.log({ event });
    if (!$pointronPreferences.horizonTargets)
      $pointronPreferences.horizonTargets = [];
    let targets = $pointronPreferences.horizonTargets?.filter(
      (x) => x.scale != item
    );
    targets?.push({ scale: item, target: +event.detail.value });
    $pointronPreferences.horizonTargets = targets;
  }
  onMount(() => {
    value =
      $pointronPreferences.horizonTargets?.find((x) => x.scale == item)
        ?.target ?? 0;
  });
</script>

<DurationInput
  bind:value
  label={{ label: getCorrespoingHorizonFrequencyLabel(item) + " focus target" }}
  on:change={onInput}
/>
