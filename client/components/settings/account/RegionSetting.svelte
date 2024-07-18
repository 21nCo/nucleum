<script lang="ts">
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import regions from "$lib/deployment/regions.json";
  export let region: string = "";
  let activeRegions = regions
    .filter((x) => x.isAvailable)
    .map((x) => {
      return { label: x.label, value: x.code };
    });
</script>

<div class="flex flex-col items-center gap-8">
  <OptionSelector
    options={activeRegions}
    bind:selected={region}
    size={$view.isPortrait ? Size.md : Size.lg}
    labelProps={{
      label: "Select your base region",
      orientation: Orientation.Vertical,
      tooltip: {
        body: "We will use this preference to host your data closest to you. This will help us to provide you with the best experience possible."
      }
    }}
    on:select
  />
</div>
