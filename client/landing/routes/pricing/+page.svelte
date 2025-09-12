<script lang="ts">
  import BottomCta from "../../shared/bottomCta/BottomCta.svelte";
  import FaQs from "../../shared/FAQs.svelte";
  import PageSeo from "../../shared/seo/PageSEO.svelte";
  import PricingSection from "../../shared/pricing/PricingSection.svelte";
  import { landing } from "../../shared/store/shared.store";
  export let data;
  const productName = data.product ?? "";
</script>

<PricingSection
  plans={data.pricingPlans}
  title="Pick a plan that's right for you"
/>
<FaQs faqs={data.faqItems} />
<BottomCta
  title={data.bottomCta.title}
  body={data.bottomCta.body}
  primaryAction={{
    isDownloadButton: true,
    type: "primary"
  }}
  secondaryAction={{
    label: "See all downloads",
    href: $landing.urls.downloads?.all,
    icon: "arrowright",
    type: "secondary"
  }}
/>

<PageSeo
  data={{
    title: `Pricing for ${productName} - Managed sync plan, free self hosting and more`,
    description: `Pricing for ${productName} - Choose the plan that's right for you`,
    keywords: [
      "pricing",
      "managed sync plan",
      "free self hosting",
      "nucleus plan"
    ],
    canonicalUrl: data.website + "/pricing"
  }}
/>
