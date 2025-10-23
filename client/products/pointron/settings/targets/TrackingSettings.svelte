<script lang="ts">
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import MultiselectDropdown from "@21n/elements/dropdown/MultiselectDropdown.svelte";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { TimeScale } from "@21n/types/time.type";
  import TargetInput from "@21n/products/pointron/settings/targets/TargetInput.svelte";
  import { onMount } from "svelte";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { InputStyle } from "@21n/types/input.type";
  import { Orientation } from "@21n/types/direction.enum";
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
