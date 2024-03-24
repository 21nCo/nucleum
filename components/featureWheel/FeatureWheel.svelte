<script>
  import OptionSelector from "$lib/tidy/elements/select/OptionSelector.svelte";
  import { FeatureWheelMode } from "$lib/tidy/types/featureWheel.type";
  import { OptionSelectorStyle } from "$lib/tidy/types/switcher.enum";
  import { memotronWheel } from "./memotronWheel";
  import FwTrial3 from "./FWTrial3.svelte";
  let mode = FeatureWheelMode.PROGRESS;
</script>

<div class="flex flex-col w-full h-full bg-bgs1">
  <FwTrial3 {mode} wheel={{ product: "memotron", features: memotronWheel }} />
  <div class="flex justify-center w-full pb-12">
    <div class="w-96">
      <OptionSelector
        items={[
          { label: FeatureWheelMode.DEFAULT },

          { label: FeatureWheelMode.PROGRESS },
          {
            label: FeatureWheelMode.CONTEMPORARY
          }
        ]}
        style={OptionSelectorStyle.CHECK_CIRCLE}
        bind:selected={mode}
      />
    </div>
  </div>
</div>
