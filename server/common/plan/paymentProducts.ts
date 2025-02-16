import {
  BillingCycle,
  PlanType,
} from "$lib/client/components/subscription/userPlan.type";

export const paymentProductsList = [
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.MONTHLY,
    dodoProductId: "pdt_MYtXY6cpkOmjEXo269U4N",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.MONTHLY,
    dodoProductId: "dodo_nucleus_monthly",
  },

  //50 discount
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.YEARLY,
    discount: 50,
    dodoProductId: "pdt_3ATqV7f09SUMeSVN8joDD",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.LIFETIME,
    discount: 50,
    dodoProductId: "dodo_sync_lifetime_50",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.YEARLY,
    discount: 50,
    dodoProductId: "pdt_3ATqV7f09SUMeSVN8joDD",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.LIFETIME,
    discount: 50,
    dodoProductId: "dodo_nucleus_lifetime_50",
  },

  //35 discount
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.YEARLY,
    discount: 35,
    dodoProductId: "dodo_sync_yearly_35",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.LIFETIME,
    discount: 35,
    dodoProductId: "dodo_sync_lifetime_35",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.YEARLY,
    discount: 35,
    dodoProductId: "dodo_nucleus_yearly_35",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.LIFETIME,
    discount: 35,
    dodoProductId: "dodo_nucleus_lifetime_35",
  },
];
