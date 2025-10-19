<script lang="ts">
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import DurationInput from "@21n/elements/input/durationInput/DurationInput.svelte";
  import type { TimeScale } from "@21n/types/time.type";
  import { getCorrespoingHorizonFrequencyLabel } from "@21n/utils/time.utils";
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
