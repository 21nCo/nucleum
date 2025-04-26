export interface PricingFeature {
  text: string;
  icon?: string;
}

export interface PricingPlan {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  price: number | { monthly: number; yearly: number; lifetime: number };
  unit?: PricingToggleOption;
  isPopular?: boolean;
  features: PricingFeature[];
  ctaText: string;
  ctaLink: string;
  timeUnit?: string;
}

export type PricingToggleOption = "monthly" | "yearly" | "lifetime";
