<script lang="ts">
  import BottomCta from "@21n/landing/shared/bottomCta/BottomCta.svelte";
  import { faqs } from "@21n/landing/shared/faqs.data";
  import FaQs from "@21n/landing/shared/FAQs.svelte";
  import type { IFaq } from "@21n/landing/shared/landing.type";
  import PricingSection from "@21n/landing/shared/pricing/PricingSection.svelte";
  import { landing } from "@21n/landing/shared/store/shared.store";
  import { pricingPlans } from "@21n/landing/memotron.io/pricing/pricing.config";
  const faqItems: IFaq[] = [
    faqs.paymentInformationNotRequired,
    faqs.offlineVersionLimitations,
    faqs.priceIncreaseInFuture,
    faqs.cancelSubscription,
    {
      title: "Who owns Memotron?",
      body: "Memotron is owned and built by 21n - 21st century native organization. Go to [21n.org](https://21n.org) to learn more about us."
    },
    faqs.whatHappensToMyData,
    faqs.canISelfHost
  ];
</script>

<PricingSection plans={pricingPlans} title="Pick a plan that's right for you" />
<FaQs faqs={faqItems} />
<BottomCta
  title="Your memory atlas"
  body="Switch to Memotron to replace stress, 10+ scattered apps and save ~ $100 /month."
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
