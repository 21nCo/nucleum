import { BillingCycle } from "$lib/client/components/subscription/userPlan.type";
import { PlanType } from "$lib/client/components/subscription/userPlan.type";
import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";
import { Agent } from "../../account/account.type";
import { resolvePromotePlanQuery, resolvePlanQuery } from "../plan.utils";
import { ValidationError, InternalServerError } from "../../errors";

export async function restore(body: any, agent: Agent) {
  const user = await retrieveUserPlan(agent.id);
  if (!user?.userPlan) {
    throw new ValidationError("User plan not found");
  }

  //TODO - use enum
  if (user.userPlan.status === "active") {
    return user;
  }

  const transactions = await retrieveUserTransactions(agent.id);
  if (!transactions || transactions.length === 0) {
    return { status: "no_transactions" };
  }

  const validTransaction = findValidTransaction(transactions);
  if (!validTransaction) {
    return { status: "no_valid_transaction" };
  }

  const userPlanUpdateResult = await promoteUserPlan({
    id: user.userPlan.id,
    cycle: validTransaction.cycle,
    plan: validTransaction.plan,
    transactionId: validTransaction.id,
    paymentDate: validTransaction.createdAt,
  });
  console.log({ userPlanUpdateResult });
  if (!userPlanUpdateResult || !userPlanUpdateResult[0]?.result?.[0]) {
    throw new InternalServerError("Failed to update user plan");
  }

  return userPlanUpdateResult[0].result[0];
}

async function retrieveUserPlan(id: string) {
  const userDataResult = await performQueryOnMasterDb(resolvePlanQuery(id));
  if (!userDataResult || !userDataResult[0]) {
    throw new ValidationError("User not found");
  }
  return userDataResult[0].result?.[0];
}

async function retrieveUserTransactions(userId: string) {
  const query = `SELECT * FROM transaction WHERE userId = user:${userId} ORDER BY createdAt DESC`;
  const transactionResult = await performQueryOnMasterDb(query);
  if (!transactionResult || !transactionResult[0]?.result) {
    return [];
  }
  return transactionResult[0].result;
}

function findValidTransaction(transactions: any[]) {
  const now = new Date();

  return transactions.find((transaction) => {
    if (transaction.status !== "completed") {
      return false;
    }

    const paymentDate = new Date(transaction.createdAt);
    const cycleInDays =
      transaction.cycle === BillingCycle.MONTHLY
        ? 30
        : transaction.cycle === BillingCycle.YEARLY
        ? 365
        : transaction.cycle === BillingCycle.LIFETIME
        ? 36500
        : 0;

    const expiryDate = new Date(
      paymentDate.getTime() + cycleInDays * 24 * 60 * 60 * 1000
    );
    return expiryDate > now;
  });
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
