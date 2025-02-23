import { BillingCycle } from "$lib/client/components/subscription/userPlan.type";
import { PlanType } from "$lib/client/components/subscription/userPlan.type";
import { paymentProductsList } from "./paymentProducts";

export function resolvePlanQuery(userId: string) {
  return `select id, context, userPlan.* as userPlan from user:${userId};`;
}

export function resolveDodoProductId({
  plan,
  cycle,
  discount,
  product,
  isTest,
}: {
  plan: string;
  cycle: string;
  discount: number;
  product: string;
  isTest: boolean;
}) {
  const record = paymentProductsList.find(
    (r) =>
      r.plan === plan &&
      r.cycle === cycle &&
      (!r.discount || r.discount === discount) &&
      (!r.product || r.product === product)
  );
  if (isTest) return record?.dodoTestProductId;
  return record?.dodoProductId;
}

export function resolvePromotePlanQuery(params?: {
  id: string;
  cycle: BillingCycle;
  plan: PlanType;
  transactionId: string;
  paymentDate: string;
}) {
  const query = `
        UPDATE ${params.id} MERGE {
            cycle: "${params.cycle}",
            plan: "${params.plan}",
            transactionId: ${params.transactionId},
            paymentDate: "${params.paymentDate}",
            status: "active"
        }
    `;
  return query;
}

export interface DodoPaymentResponse {
  status?: string;
  [key: string]: any;
}

export function resolveTransactionStatus(
  isSubscription: boolean,
  paymentStatus: DodoPaymentResponse
): "completed" | "failed" | "pending" {
  if (!paymentStatus?.status) {
    return "pending";
  }

  if (isSubscription && paymentStatus.status === "active") {
    return "completed";
  }
  if (!isSubscription && paymentStatus.status === "succeeded") {
    return "completed";
  }
  if (paymentStatus.status === "failed") {
    return "failed";
  }
  return "pending";
}
