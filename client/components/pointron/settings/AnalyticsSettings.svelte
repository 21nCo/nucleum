<script lang="ts">
  import { userLocalPreferences } from "$lib/client/components/pointron/local.store";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
</script>

<div class="flex flex-col gap-4 w-full">
  <SwitchInput
    label={{
      label: "Include break in analytics",
      orientation: Orientation.Horizontal
    }}
    bind:checked={$userLocalPreferences.isIncludeBreakInAnalytics}
  />
</div>
