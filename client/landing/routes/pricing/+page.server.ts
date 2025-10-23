import { SITE, IS_PRODUCT_PAGE } from "$env/static/private";
import type { PricingPlan } from "@21n/landing/shared/pricing/pricing.types";
import { freePlan, nucleusPlan } from "@21n/landing/shared/pricing/pricing.data";
import type { IFaq } from "@21n/landing/shared/landing.type";
import { faqs } from "@21n/landing/shared/faqs.data";

export const prerender =
  IS_PRODUCT_PAGE === "true" && (SITE === "Memotron" || SITE === "Pointron");

const syncPlan: PricingPlan = {
  id: "sync",
  icon: "memotron-sync-plan",
  title: "Memotron sync",
  subtitle: "Real-time sync across all devices",
  price: { monthly: 7, yearly: 60, lifetime: 225 },
  features: [
    { text: "All features without limits" },
    { text: "Sync across all your devices" },
    { text: "Unlimited small file (< 25 MB) storage" },
    { text: "20 GB of included large file storage" },
    { text: "Email and community support" }
  ],
  ctaText: "Get started for free"
};

const baseFaqs: IFaq[] = [
  faqs.paymentInformationNotRequired,
  faqs.offlineVersionLimitations,
  faqs.priceIncreaseInFuture,
  faqs.cancelSubscription,
  faqs.whatHappensToMyData,
  faqs.canISelfHost
];

function resolveBottomCta(product: string) {
  switch (product) {
    case "memotron":
      return {
        title: "Your memory atlas",
        body: "Switch to Memotron to replace stress, 10+ scattered apps and save ~ $100 /month."
      };
    case "pointron":
      return {
        title: "Design your day. Define your path.",
        body: "Gently guide your time, grow your habits, and reach your goals - at your own pace"
      };
    default:
      return {
        title: "",
        body: ""
      };
  }
}

export function load() {
  const product = SITE;
  const syncPlanOfProduct = {
    ...syncPlan,
    icon: `${product.toLowerCase()}-sync-plan`,
    title: `${product} sync`
  };
  const faqItems = [
    ...baseFaqs,
    {
      title: `Who owns ${product}?`,
      body: `${product} is owned and built by 21n - 21st century native organization. Go to [21n.org](https://21n.org) to learn more about us.`
    }
  ];
  const bottomCta = resolveBottomCta(product.toLowerCase());
  return {
    pricingPlans: [freePlan, syncPlanOfProduct, nucleusPlan],
    faqItems,
    bottomCta
  };
}
