<script lang="ts">
  import FeatureWheel from "@21n/components/featureWheel/FeatureWheel.svelte";
  import {
    FeatureWheelMode,
    type IFwCategory,
    type IFwFeature,
    type IContemporary
  } from "@21n/types/featureWheel.type";
  let {
    product,
    title,
    features,
    categories,
    contemporaries,
  }: {
    product: string;
    title: string;
    features: IFwFeature[];
    categories: IFwCategory[];
    contemporaries: IContemporary[];
  } = $props();

</script>

<FeatureWheel
  mode={FeatureWheelMode.COMPARER}
  {product}
  {title}
  {features}
  {categories}
  {contemporaries}
/>
