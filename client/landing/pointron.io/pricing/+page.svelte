<script lang="ts">
  import BottomCta from "@21n/landing/shared/bottomCta/BottomCta.svelte";
  import FaQs from "@21n/landing/shared/FAQs.svelte";
  import type { IFaq } from "@21n/landing/shared/landing.type";
  import PricingSection from "@21n/landing/shared/pricing/PricingSection.svelte";
  import { landing } from "@21n/landing/shared/store/shared.store";
  import { pricingPlans } from "@21n/landing/pointron.io/pricing/pricing.config";
  import { faqs } from "@21n/landing/shared/faqs.data";
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
