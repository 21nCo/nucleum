<script lang="ts">
  import FeatureWheelComparer from "../../shared/FeatureWheelComparer.svelte";
  import PageSeo from "../../shared/seo/PageSEO.svelte";

  export let data: {
    product?: string;
    features?: any[];
    categories?: any[];
    contemporaries?: any[];
    website: string;
  };

  const productName = data?.product ?? "";
  const safeProduct = data?.product?.toLowerCase() ?? "";
</script>

<FeatureWheelComparer
  product={safeProduct}
  title={`${productName} wholesome wheel`}
  features={data?.features ?? []}
  categories={data?.categories ?? []}
  contemporaries={data?.contemporaries ?? []}
/>

<PageSeo
  data={{
    title: `Compare ${productName} with other apps`,
    description: `Compare ${productName} with other apps`,
    keywords: ["compare", "features", "alternatives"],
    canonicalUrl: (data?.website ?? "") + "/compare"
  }}
/>
