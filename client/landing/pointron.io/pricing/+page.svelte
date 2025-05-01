<script>
  import BottomCta from "../../shared/bottomCta/BottomCta.svelte";
  import FaQs from "../../shared/FAQs.svelte";
  import PricingSection from "../../shared/pricing/PricingSection.svelte";
  import { landing } from "../../shared/store/shared.store";
  import { pricingPlans } from "./pricing.config";
  const faqItems = [
    {
      title: "Do I need to enter my payment information to use free trial?",
      body: "No, you can use the free trial without entering your payment information or subscribing to any plan. Your free trial auto starts once your signup on the app."
    },
    // {
    //   title: "What do I need to pay for PYOD?",
    //   body: "We still need to run mediator sync server to sync your data to your plugged database."
    // },
    {
      title: "Are there any limits on offline version of the app?",
      body: "All features are available on offline version of the app without any limitations or restrictions whatsoever."
    },
    {
      title: "Can I cancel once I subscribe?",
      body: "Yes, you can cancel within grace period for yearly and lifetime plans. The grace period is 14 days for yearly plans and 1 month for lifetime plans. We do not have any hidden fees or contracts. Kindly email us at hello@21n.org if you have any questions."
    },
    {
      title: "Who owns Pointron?",
      body: "Pointron is owned and built by 21n.org - 21st century native organization. Go to 21n.org to learn more about us."
    },
    {
      title: "What happens to my data if Pointron is shutdown for some reason?",
      body: "We immensely value your data as much as you do. Therefore we prioritized building interoperability features on our roadmap. Even if Pointron doesn't exist in 2 years down the line, you will still have access to all the your data safely exported or backed up on to your personal cloud."
    }
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
