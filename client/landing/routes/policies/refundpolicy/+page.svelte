<script lang="ts">
  import RefundPolicy from "@21n/landing/shared/RefundPolicy.svelte";
  import PageSeo from "@21n/landing/shared/seo/PageSEO.svelte";
  let { data }: { data: any } = $props();
  const productName = data.product ?? "";
</script>

<div
  class="relative flex flex-col justify-start items-start text-start w-full h-auto p-8"
>
  <RefundPolicy />
</div>

<PageSeo
  data={{
    title: `Refund Policy - ${productName}`,
    description: `Refund Policy for ${productName} - understand our refund terms and conditions for ${productName}'s premium features and services.`,
    keywords: ["refund policy"],
    canonicalUrl: "https://21n.org/policies/refundpolicy"
  }}
/>
