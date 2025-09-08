<script lang="ts">
  import FeatureWheel from "$lib/client/components/featureWheel/FeatureWheel.svelte";
  import {
    FeatureWheelMode,
    type IFwCategory,
    type IFwFeature,
    type IContemporary
  } from "$lib/client/types/featureWheel.type";
  export let product: string;
  export let title: string;
  export let features: IFwFeature[];
  export let categories: IFwCategory[];
  export let contemporaries: IContemporary[];
</script>

<FeatureWheel
  mode={FeatureWheelMode.COMPARER}
  {product}
  {title}
  {features}
  {categories}
  {contemporaries}
/>
