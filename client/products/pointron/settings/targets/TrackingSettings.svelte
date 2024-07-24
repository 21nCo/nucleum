<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import MultiselectDropdown from "$lib/client/elements/dropdown/MultiselectDropdown.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { TimeScale } from "$lib/client/types/time.type";
  import TargetInput from "./TargetInput.svelte";
  import { onMount } from "svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  let timescaleOptions = $userPreferences.timeScales
    ? $userPreferences.timeScales.map((x) => {
        return { label: properCase(x), value: TimeScale[x] };
      })
    : Object.keys(TimeScale).map((key) => {
        return {
          label: properCase(key),
          value: TimeScale[key]
        };
      });
  onMount(() => {
    $pointronPreferences.horizonsWithTarget =
      $pointronPreferences.horizonsWithTarget?.filter((x) =>
        $userPreferences.timeScales?.some((y) => y == x)
      );
  });
</script>

<div class="flex flex-col gap-4 w-full h-full">
  <MultiselectDropdown
    label={{
      label: "Enable target for these time scales",
      orientation: Orientation.Vertical
    }}
    options={timescaleOptions}
    bind:selected={$pointronPreferences.horizonsWithTarget}
    style={InputStyle.BORDERED}
  />

  {#if $pointronPreferences.horizonsWithTarget && $pointronPreferences.horizonsWithTarget.length > 0}
    {#each $pointronPreferences.horizonsWithTarget as item}
      <TargetInput {item} />
    {/each}
  {/if}
</div>
