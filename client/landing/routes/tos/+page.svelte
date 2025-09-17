<script lang="ts">
  import TermsofService from "../../shared/TermsofService.svelte";
  import PageSeo from "../../shared/seo/PageSEO.svelte";
  export let data;
  const productName = data.product ?? "";
</script>

<div
  class="relative flex flex-col justify-start items-start text-start w-full h-auto p-8"
>
  <TermsofService />
</div>

<PageSeo
  data={{
    title: `Terms of Service - ${productName}`,
    description: `Terms of Service for ${productName} - understand our terms and conditions for using ${productName}'s services.`,
    keywords: ["Terms of service"],
    canonicalUrl: "https://21n.org/tos"
  }}
/>
