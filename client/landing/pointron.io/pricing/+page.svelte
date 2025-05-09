<script lang="ts">
  import BottomCta from "../../shared/bottomCta/BottomCta.svelte";
  import FaQs from "../../shared/FAQs.svelte";
  import type { IFaq } from "../../shared/landing.type";
  import PricingSection from "../../shared/pricing/PricingSection.svelte";
  import { landing } from "../../shared/store/shared.store";
  import { pricingPlans } from "./pricing.config";
  import { faqs } from "../../shared/faqs.data";
  const faqItems: IFaq[] = [
    faqs.paymentInformationNotRequired,
    faqs.offlineVersionLimitations,
    faqs.priceIncreaseInFuture,
    faqs.cancelSubscription,
    {
      title: "Who owns Pointron?",
      body: "Pointron is owned and built by 21n - 21st century native organization. Go to [21n.org](https://21n.org) to learn more about us."
    },
    faqs.whatHappensToMyData
  ];
</script>

<PricingSection
  plans={pricingPlans}
  title="Pick the plan that's right for you"
/>
<FaQs faqs={faqItems} />
<BottomCta
  title="Design your day. Define your path."
  body="Gently guide your time, grow your habits, and reach your goals - at your own pace"
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
