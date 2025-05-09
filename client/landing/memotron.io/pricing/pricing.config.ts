import type { PricingPlan } from "../../shared/pricing/pricing.types";
import { freePlan, nucleusPlan } from "../../shared/pricing/pricing.data";

const syncPlan: PricingPlan = {
  id: "sync",
  icon: "memotron-sync-plan",
  title: "Memotron sync",
  subtitle: "Real-time sync across all devices",
  price: { monthly: 7, yearly: 60, lifetime: 225 },
  features: [
    { text: "Unlimited cloud sync" },
    { text: "20 GB of media storage" },
    { text: "Email and community support" }
  ],
  ctaText: "Get started for free"
};

export const pricingPlans = [freePlan, syncPlan, nucleusPlan];
