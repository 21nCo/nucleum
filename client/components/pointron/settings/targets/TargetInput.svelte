<script lang="ts">
  import { userLocalPreferences } from "$lib/client/components/pointron/local.store";
  import DurationInput from "$lib/client/elements/input/durationInput/DurationInput.svelte";
  import type { TimeScale } from "$lib/client/types/time.type";
  import { getCorrespoingHorizonFrequencyLabel } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  export let item: TimeScale;
  let value: number;
  function onInput(event: any) {
    console.log({ event });
    if (!$userLocalPreferences.horizonTargets)
      $userLocalPreferences.horizonTargets = [];
    let targets = $userLocalPreferences.horizonTargets?.filter(
      (x) => x.scale != item
    );
    targets?.push({ scale: item, target: +event.detail.value });
    $userLocalPreferences.horizonTargets = targets;
  }
  onMount(() => {
    value =
      $userLocalPreferences.horizonTargets?.find((x) => x.scale == item)
        ?.target ?? 0;
  });
</script>

<DurationInput
  bind:value
  label={{ label: getCorrespoingHorizonFrequencyLabel(item) + " focus target" }}
  on:change={onInput}
/>
