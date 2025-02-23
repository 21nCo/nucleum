import { Agent } from "../../account/account.type";
import {
  ValidationError,
  NotFoundError,
  InternalServerError,
} from "../../errors";
import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";
import { verifyPayment } from "../dodoPaymentProvider";
import {
  BillingCycle,
  PlanType,
} from "$lib/client/components/subscription/userPlan.type";
import { resolvePlanQuery, resolvePromotePlanQuery } from "../plan.utils";

interface VerifyRequest {
  nonce: string;
  isReconciliation?: boolean;
}

export async function verify(body: VerifyRequest, agent: Agent) {
  if (!body.nonce) {
    throw new ValidationError("Nonce is required", "nonce");
  }

  const user = await retrieveUserPlan(agent.id);
  const transaction = await retrieveTransaction(body.nonce);
  if (transaction.status === "completed" && !body.isReconciliation) {
    return user;
  }

  if (
    !transaction.dodoPayment ||
    (!transaction.dodoPayment.payment_id &&
      !transaction.dodoPayment.subscription_id)
  ) {
    throw new InternalServerError(
      "Invalid transaction: missing payment information"
    );
  }
  const isSubscription = !!transaction.dodoPayment.subscription_id;
  const paymentStatus = await verifyPayment(
    transaction.dodoPayment.payment_id ??
      transaction.dodoPayment.subscription_id,
    isSubscription
  );

  if (!paymentStatus) {
    throw new InternalServerError("Failed to verify payment status");
  }
  console.log({ user, transaction, paymentStatus });

  const newStatus =
    (isSubscription && paymentStatus.status === "active") ||
    (!isSubscription && paymentStatus.status === "succeeded")
      ? "completed"
      : paymentStatus.status === "failed"
      ? "failed"
      : "pending";

  const updateQuery = `
    UPDATE ${transaction.id} MERGE {
      status: "${newStatus}",
      lastVerified: time::now(),
      paymentStatus: ${JSON.stringify(paymentStatus)}
    }
  `;

  const updateResult = await performQueryOnMasterDb(updateQuery);

  if (!updateResult || !updateResult[0]?.result?.[0]) {
    throw new InternalServerError("Failed to update transaction status");
  }

  const updatedTransaction = updateResult[0].result[0];

  if (newStatus === "completed") {
    const userPlanUpdateResult = await promoteUserPlan({
      id: user.userPlan.id,
      cycle: updatedTransaction.cycle,
      plan: updatedTransaction.plan,
      transactionId: updatedTransaction.id,
      paymentDate: updatedTransaction.createdAt,
    });
    if (!userPlanUpdateResult || !userPlanUpdateResult[0]?.result?.[0]) {
      throw new InternalServerError("Failed to update user plan");
    }
    const updatedUserPlan = userPlanUpdateResult[0].result[0];
    return updatedUserPlan;
  }
  console.log({ newStatus });
  return {
    status: newStatus,
  };
}

export async function webhook(body: any) {
  console.log({ body });
}

async function retrieveTransaction(nonce: string) {
  const query = `SELECT * FROM transaction WHERE nonce = "${nonce}"`;
  const transactionResult = await performQueryOnMasterDb(query);
  if (!transactionResult || !transactionResult[0]?.result?.[0]) {
    throw new NotFoundError("Transaction not found");
  }
  return transactionResult[0].result[0];
}

async function promoteUserPlan(params?: {
  id: string;
  cycle: BillingCycle;
  plan: PlanType;
  transactionId: string;
  paymentDate: string;
}) {
  const query = resolvePromotePlanQuery(params);
  const updateResult = await performQueryOnMasterDb(query);
  return updateResult;
}

async function retrieveUserPlan(id: string) {
  const userDataResult = await performQueryOnMasterDb(resolvePlanQuery(id));
  if (!userDataResult || !userDataResult[0])
    throw new ValidationError("User not found");
  const user = userDataResult[0].result?.[0];
  return user;
}
