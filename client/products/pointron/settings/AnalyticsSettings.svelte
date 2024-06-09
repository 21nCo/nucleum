<script lang="ts">
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
</script>

<div class="flex flex-col gap-4 w-full">
  <SwitchInput
    label={{
      label: "Include break in analytics",
      orientation: Orientation.Horizontal
    }}
    bind:checked={$pointronPreferences.isIncludeBreakInAnalytics}
  />
</div>
