<script lang="ts">
  import BottomCta from "../../shared/bottomCta/BottomCta.svelte";
  import { faqs } from "../../shared/faqs.data";
  import FaQs from "../../shared/FAQs.svelte";
  import type { IFaq } from "../../shared/landing.type";
  import PricingSection from "../../shared/pricing/PricingSection.svelte";
  import { landing } from "../../shared/store/shared.store";
  import { pricingPlans } from "./pricing.config";
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
