import type { PricingPlan } from "@21n/landing/shared/pricing/pricing.types";
import { freePlan, nucleusPlan } from "@21n/landing/shared/pricing/pricing.data";

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

export const pricingPlans = [freePlan, syncPlan, nucleusPlan];
