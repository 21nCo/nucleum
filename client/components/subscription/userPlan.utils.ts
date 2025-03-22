import {
  LicenseType,
  PlanStatus,
  type IUserPlan
} from "$lib/client/types/account.type";
import { formatDate } from "$lib/client/utils/time.utils";
import { enumToString } from "$lib/shared/utils/text.utils";
import { BillingCycle, PlanType, type IPlan } from "./userPlan.type";

const plans = import.meta.env.VITE_PLANS;
let rates: number[] = [7, 60, 200, 15, 144, 450];
if (plans) {
  rates = plans.split(",").map((rate: string) => parseInt(rate));
}

export const SUBSCRIPTION_PLANS: IPlan[] = [
  {
    name: "sync",
    type: PlanType.CLOUD_SYNC,
    description: "Real-time sync across all devices",
    price: {
      [BillingCycle.MONTHLY]: rates[0],
      [BillingCycle.YEARLY]: rates[1],
      [BillingCycle.LIFETIME]: rates[2]
    },
    features: [
      {
        icon: "ph:arrows-left-right-light",
        label: "Unlimited cloud sync"
      },
      // {
      //   icon: "ph:lock-light",
      //   label: "End-to-end encryption"
      // },
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
      [BillingCycle.MONTHLY]: rates[3],
      [BillingCycle.YEARLY]: rates[4],
      [BillingCycle.LIFETIME]: rates[5]
    },
    features: [
      {
        icon: "ph:arrows-left-right-light",
        label:
          "Unlimited cloud sync for Memotron, Pointron *(more coming soon)*"
      },
      // {
      //   icon: "ph:lock-light",
      //   label: "End-to-end encryption"
      // },
      {
        icon: "ph:database-light",
        label: "100 GB of media storage *(add-on for more)*"
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
        label: "Support our mission *(21n.org)*"
      }
    ],
    isPopular: true
  }
];

export function resolveLicenseString(userInfo: any) {
  if (userInfo?.licenseType) {
    switch (userInfo?.licenseType) {
      case LicenseType.EA_LIFETIME:
        return "Early Adopter - lifetime license";
      case LicenseType.EA_EXTENDED:
        return "Early Adopter - 2 years extended trial";
      case LicenseType.FREE:
        return "Free plan";
    }
  } else if (userInfo?.joinDate) {
    const joinDate = new Date(userInfo?.joinDate);
    const joinDateIsBeforeJan012024 = joinDate < new Date(2024, 1, 1);
    const joinDateIsBeforeNov132024 = joinDate < new Date(2024, 10, 13);
    const joinDateIsBeforeNov182024 = joinDate < new Date(2024, 10, 18);
    const joinDateIsBeforeDec012024 = joinDate < new Date(2024, 11, 1);
    if (joinDateIsBeforeJan012024) {
      return "Early Adopter - lifetime license";
    } else if (joinDateIsBeforeNov132024) {
      return "1 year free cloud sync 🎉 (First 500 early adopters)";
    } else if (joinDateIsBeforeNov182024) {
      return "4 mo free cloud sync 🎉 (First 1000 early adopters)";
    } else if (joinDateIsBeforeDec012024) {
      return "2 mo free cloud sync 🎉 (First 5000 users)";
    } else {
      return "Early Adopter - limited free cloud sync trial";
    }
  }
}

export function resolvePlanLabel(plan: IUserPlan | undefined) {
  if (!plan || !plan.plan) return "Unknown plan";
  if (plan.plan === PlanType.TRIAL) {
    const isActive = determineIfPlanIsActive(plan);
    if (!isActive) {
      return `Free trial expired - Please upgrade`;
    } else if (plan.trialPlan?.expiry) {
      return `Free trial - expires ${formatDate(
        new Date(plan.trialPlan?.expiry)
      )}`;
    } else {
      return `Free trial`;
    }
  } else if (
    plan.plan === PlanType.NUCLEUS ||
    plan.plan === PlanType.CLOUD_SYNC
  ) {
    if (
      plan.status === PlanStatus.REFUNDED ||
      plan.status === PlanStatus.CANCELLED
    ) {
      return `Plan cancelled`;
    } else if (plan.billingErrors) {
      return `Billing issue`;
    } else {
      return `${enumToString(plan.plan)} - ${plan.cycle} plan`;
    }
  } else {
    return `Unknown plan`;
  }
}

export function determineIfPlanIsActive(plan: IUserPlan) {
  if (plan.plan === PlanType.TRIAL && plan.trialPlan?.expiry) {
    const isExpired =
      new Date(plan.trialPlan.expiry).getTime() < new Date().getTime();
    return !isExpired;
  } else if (
    (plan.plan === PlanType.CLOUD_SYNC || plan.plan === PlanType.NUCLEUS) &&
    plan.billingErrors
  ) {
    return false;
  } else if (plan.status === PlanStatus.REFUNDED) {
    return false;
  }
  return true;
}

export function determineIfSubscriptionExpired(plan: IUserPlan) {
  if (plan.cycle === BillingCycle.LIFETIME)
    return {
      isExpired: false
    };
  if (plan.plan === PlanType.CLOUD_SYNC || plan.plan === PlanType.NUCLEUS) {
    const buffer = plan.status === PlanStatus.CANCELLED ? 2 : 7;
    const purchaseDate =
      typeof plan.paymentDate === "string"
        ? new Date(plan.paymentDate)
        : plan.paymentDate;
    const renewalDate = plan.renewalDate
      ? new Date(plan.renewalDate)
      : new Date(
          purchaseDate.getTime() +
            (plan.cycle === BillingCycle.MONTHLY
              ? 31 * 24 * 60 * 60 * 1000
              : 365 * 24 * 60 * 60 * 1000)
        );
    const isExpired =
      renewalDate.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();
    const isWithinBuffer =
      renewalDate.getTime() + buffer * 24 * 60 * 60 * 1000 >
      new Date().getTime();
    return {
      isExpired,
      isWithinBuffer
    };
  }
  return {
    isExpired: false
  };
}

export function resolveDiscountLabel(plan: IUserPlan) {
  if (!plan?.discount) return null;
  if (plan.discount.first) {
    const discount = plan.discount.first;
    if (discount === 50) {
      return "As a early adopter, you get 50% off for annual/lifetime plans on your first purchase";
    } else if (discount === 35) {
      return "As a early member, you get 35% off for annual/lifetime plans on your first purchase";
    } else {
      return `You are eligible for a ${discount}% discount on your first purchase`;
    }
  }
  return null;
}

export function resolveNextRenewalDate(plan: IUserPlan) {
  if (
    !plan?.paymentDate ||
    plan.plan === PlanType.TRIAL ||
    plan.cycle === BillingCycle.LIFETIME
  )
    return null;
  const paymentDate = new Date(plan.paymentDate);
  let multiplier = 1;
  if (plan.cycle === BillingCycle.MONTHLY) {
    multiplier = 30;
  } else if (plan.cycle === BillingCycle.YEARLY) {
    multiplier = 365;
  }
  const nextRenewal = new Date(
    paymentDate.getTime() + 24 * 60 * 60 * 1000 * multiplier
  );
  return nextRenewal;
}

export function resolveTrialDaysLeft(plan: IUserPlan) {
  if (plan.plan !== PlanType.TRIAL) return null;
  const trialPlan = plan.trialPlan;
  if (!trialPlan) return null;
  const expiry = new Date(trialPlan.expiry);
  const daysLeft = Math.ceil(
    (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysLeft;
}
