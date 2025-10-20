<script lang="ts">
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import view from "@21n/stores/view.store";
  import { Orientation } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import regions from "$lib/deployment/regions.json";
  export let region: string = "";
  export let isDisabled: boolean = false;
  let activeRegions: any[] = [];
  $: resolveRegions(isDisabled);

  function resolveRegions(isDisabled: boolean) {
    activeRegions = regions
      .filter((x) => x.isAvailable)
      .map((x) => {
        return { label: x.label, value: x.code, isDisabled };
      });
  }
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
