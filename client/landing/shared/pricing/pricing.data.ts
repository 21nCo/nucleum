import type { PricingPlan } from "./pricing.types";

export const freePlan: PricingPlan = {
  id: "free",
  icon: "offline-plan",
  title: "Offline & free forever",
  subtitle: "Perfect for single device use",
  price: 0,
  features: [
    { text: "All features without limits" },
    { text: "No login required" },
    { text: "Community support" }
  ],
  ctaText: "Free forever"
};

export const nucleusPlan: PricingPlan = {
  id: "nucleus",
  icon: "nucleus-plan",
  title: "Nucleus",
  subtitle: "Everything productivity, single plan",
  price: { monthly: 15, yearly: 144, lifetime: 450 },
  features: [
    { text: "Unlimited cloud sync for Memotron, Pointron" },
    { text: "Access to Nucleus (web beta)" },
    { text: "100 GB of media storage" },
    { text: "Early access to new features" },
    { text: "Priority support" },
    { text: "Support our mission" }
  ],
  ctaText: "Get started for free"
};

export const databasePlan: PricingPlan = {
  id: "database",
  icon: "database",
  title: "Plug your own database",
  subtitle: "Content",
  price: 40,
  unit: "lifetime",
  features: [
    { text: "Unlimited cloud sync for Memotron, Pointron" },
    { text: "100 GB of media storage" },
    {
      text: "Access to Nucleus - the everything productivity app"
    },
    { text: "Access to MCP server" },
    { text: "Priority chat support" },
    { text: "Support our mission" }
  ],
  ctaText: "Get started for free"
};
