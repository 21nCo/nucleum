import {
  BillingCycle,
  PlanType,
} from "$lib/client/components/subscription/userPlan.type";

export const paymentProductsList = [
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.MONTHLY,
    dodoTestProductId: "pdt_MYtXY6cpkOmjEXo269U4N",
    dodoProductId: "pdt_MYtXY6cpkOmjEXo269U4N",
    product: "memotron",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.MONTHLY,
    dodoTestProductId: "pdt_pBoTXdFeWgAHrGCjDAVYi",
    dodoProductId: "pdt_pBoTXdFeWgAHrGCjDAVYi",
    product: "pointron",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.MONTHLY,
    dodoTestProductId: "pdt_Nvs8lfZ9Y99CRcixIP5qG",
    dodoProductId: "pdt_Nvs8lfZ9Y99CRcixIP5qG",
  },

  //50 discount - Early Adopter
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.YEARLY,
    discount: 50,
    dodoTestProductId: "pdt_3ATqV7f09SUMeSVN8joDD",
    dodoProductId: "pdt_3ATqV7f09SUMeSVN8joDD",
    product: "memotron",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.LIFETIME,
    discount: 50,
    dodoTestProductId: "pdt_cNJvkU7N8lRjCQjAuVmy9",
    dodoProductId: "pdt_cNJvkU7N8lRjCQjAuVmy9",
    product: "memotron",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.YEARLY,
    discount: 50,
    dodoTestProductId: "pdt_3ATqV7f09SUMeSVN8joDD",
    dodoProductId: "pdt_3ATqV7f09SUMeSVN8joDD",
    product: "pointron",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.LIFETIME,
    discount: 50,
    dodoTestProductId: "pdt_cNJvkU7N8lRjCQjAuVmy9",
    dodoProductId: "pdt_cNJvkU7N8lRjCQjAuVmy9",
    product: "pointron",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.YEARLY,
    discount: 50,
    dodoTestProductId: "pdt_jXYEJwqMoo7RpfVgokVtO",
    dodoProductId: "pdt_jXYEJwqMoo7RpfVgokVtO",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.LIFETIME,
    discount: 50,
    dodoTestProductId: "pdt_gIRu875ZyIKNMR4U1q0UF",
    dodoProductId: "pdt_gIRu875ZyIKNMR4U1q0UF",
  },

  //35 discount - Early user
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.YEARLY,
    discount: 35,
    dodoTestProductId: "pdt_TOLdH2hskLlGQ1pxEEkSH",
    dodoProductId: "pdt_TOLdH2hskLlGQ1pxEEkSH",
    product: "memotron",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.LIFETIME,
    discount: 35,
    dodoTestProductId: "pdt_biVLxJLLWGTLxQKB57Syn",
    dodoProductId: "pdt_biVLxJLLWGTLxQKB57Syn",
    product: "memotron",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.YEARLY,
    discount: 35,
    dodoTestProductId: "pdt_4y61JxSOOcNQeqOHwrxZF",
    dodoProductId: "pdt_4y61JxSOOcNQeqOHwrxZF",
    product: "pointron",
  },
  {
    plan: PlanType.CLOUD_SYNC,
    cycle: BillingCycle.LIFETIME,
    discount: 35,
    dodoTestProductId: "pdt_vdYmzl4h8nZbFsYQgwpZy",
    dodoProductId: "pdt_vdYmzl4h8nZbFsYQgwpZy",
    product: "pointron",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.YEARLY,
    discount: 35,
    dodoTestProductId: "pdt_JN7Of2q0iLVj90hH102a9",
    dodoProductId: "pdt_JN7Of2q0iLVj90hH102a9",
  },
  {
    plan: PlanType.NUCLEUS,
    cycle: BillingCycle.LIFETIME,
    discount: 35,
    dodoTestProductId: "pdt_9x100GN44er5Z70i4ukme",
    dodoProductId: "pdt_9x100GN44er5Z70i4ukme",
  },
];
