<script lang="ts">
  import BottomCta from "@21n/landing/shared/bottomCta/BottomCta.svelte";
  import FaQs from "@21n/landing/shared/FAQs.svelte";
  import PageSeo from "@21n/landing/shared/seo/PageSEO.svelte";
  import PricingSection from "@21n/landing/shared/pricing/PricingSection.svelte";
  import { landing } from "@21n/landing/shared/store/shared.store";

  let { data }: {
    product?: string;
    pricingPlans?: any[];
    faqItems?: any[];
    bottomCta?: { title?: string; body?: string };
    website: string;
    urls?: { downloads?: { all?: string } };
  } = $props();

  const productName = data?.product ?? "";

  let downloadsUrl = $derived(
    data?.urls?.downloads?.all || ($landing?.urls?.downloads?.all ?? "")
  );
</script>

<PricingSection
  plans={data?.pricingPlans ?? []}
  title="Pick a plan that's right for you"
/>
<FaQs faqs={data?.faqItems ?? []} />
<BottomCta
  title={data?.bottomCta?.title ?? "Get Started"}
  body={data?.bottomCta?.body ?? "Start using our platform today"}
  primaryAction={{
    isDownloadButton: true,
    type: "primary"
  }}
  secondaryAction={{
    label: "See all downloads",
    href: downloadsUrl,
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
    canonicalUrl: (data?.website ?? "") + "/pricing"
  }}
/>
