export enum BillingCycle {
  MONTHLY = "monthly",
  YEARLY = "yearly",
  LIFETIME = "lifetime"
}

export enum PlanType {
  TRIAL = "trial",
  CLOUD_SYNC = "sync",
  NUCLEUS = "nucleus"
}

export interface IPlan {
  name: string;
  type: PlanType;
  description: string;
  price: Record<BillingCycle, string>;
  features: {
    icon: string;
    label: string;
  }[];
  isPopular?: boolean;
}

export interface ICurrentPlan {
  type: PlanType;
  billingCycle: BillingCycle;
}
