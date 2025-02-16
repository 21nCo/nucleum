import { BillingCycle, PlanType, type IPlan } from "./userPlan.type";

export const SUBSCRIPTION_PLANS: IPlan[] = [
  {
    name: "Memotron Sync",
    type: PlanType.CLOUD_SYNC,
    description: "Real-time sync across all devices for Memotron",
    price: {
      [BillingCycle.MONTHLY]: 7,
      [BillingCycle.YEARLY]: 60,
      [BillingCycle.LIFETIME]: 250
    },
    features: [
      {
        icon: "ph:arrows-left-right-light",
        label: "Unlimited cloud sync"
      },
      {
        icon: "ph:lock-light",
        label: "End-to-end encryption"
      },
      {
        icon: "ph:database-light",
        label: "20 GB of media storage (add-on for more)"
      },
      {
        icon: "ph:at-light",
        label: "Email and community support"
      }
    ]
  },
  {
    name: "Nucleus",
    type: PlanType.NUCLEUS,
    description: "Everything productivity, single plan",
    price: {
      [BillingCycle.MONTHLY]: 15,
      [BillingCycle.YEARLY]: 144,
      [BillingCycle.LIFETIME]: 450
    },
    features: [
      {
        icon: "ph:arrows-left-right-light",
        label:
          "Unlimited cloud sync for Memotron, Pointron - [more soon](https://21n.org)"
      },
      {
        icon: "ph:lock-light",
        label: "End-to-end encryption"
      },
      {
        icon: "ph:database-light",
        label: "100 GB of media storage (add-on for more)"
      },
      {
        icon: "ph:sparkle-light",
        label: "Early access to Nucleus - the everything productivity app"
      },
      {
        icon: "ph:clock-light",
        label: "Early access to new products, features"
      },
      {
        icon: "ph:chat-centered-dots-light",
        label: "Priority chat support"
      },
      {
        icon: "ph:hand-heart-light",
        label: "Support independent organization - [21n.org](https://21n.org)"
      }
    ],
    isPopular: true
  }
];
