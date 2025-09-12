<script lang="ts">
  import FeatureWheelComparer from "../../shared/FeatureWheelComparer.svelte";
  import PageSeo from "../../shared/seo/PageSEO.svelte";
  export let data;
  const productName = data.product ?? "";
</script>

<FeatureWheelComparer
  product={data.product.toLowerCase()}
  title={`${data.product} wholesome wheel`}
  features={data.features}
  categories={data.categories}
  contemporaries={data.contemporaries}
/>

<PageSeo
  data={{
    title: `Comapare ${productName} with other apps`,
    description: `Comapare ${productName} with other apps`,
    keywords: [],
    canonicalUrl: data.website + "/compare"
  }}
/>
