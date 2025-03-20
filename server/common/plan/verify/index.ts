import { Agent } from "../../account/account.type";
import {
  ValidationError,
  NotFoundError,
  InternalServerError
} from "../../errors";
import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";
import { verifyPayment } from "../dodoPaymentProvider";
import { verifyAppleSubscription } from "../applePaymentProvider";
import {
  BillingCycle,
  PlanType
} from "$lib/client/components/subscription/userPlan.type";
import {
  resolvePlanQuery,
  resolvePromotePlanQuery,
  resolveTransactionStatusFromDodo,
  resolveTransactionStatusFromApple
} from "../plan.utils";

interface VerifyRequest {
  nonce: string;
  embedTransaction?: any;
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

  let result = null;
  if (transaction.embed) {
    switch (transaction.embed) {
      case "apple":
        result = await handleAppleStoreVerification({
          transaction,
          body,
          user
        });
        break;
      case "google":
        result = await handleGoogleStoreVerification({ transaction, user });
        break;
      case "microsoft":
        result = await handleMicrosoftStoreVerification({ transaction, user });
        break;
      default:
        throw new InternalServerError("Invalid embed");
    }
  } else {
    result = await handleDodoPaymentVerification(transaction, user);
  }
  return result;
}

async function handleDodoPaymentVerification(transaction: any, user: any) {
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

  const newStatus = resolveTransactionStatusFromDodo(
    isSubscription,
    paymentStatus
  );
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
      paymentDate: updatedTransaction.createdAt
    });
    if (!userPlanUpdateResult || !userPlanUpdateResult[0]?.result?.[0]) {
      throw new InternalServerError("Failed to update user plan");
    }
    const updatedUserPlan = userPlanUpdateResult[0].result[0];
    return updatedUserPlan;
  }
  console.log({ newStatus });
  return {
    status: newStatus
  };
}

async function handleAppleStoreVerification(params: {
  transaction: any;
  body: any;
  user: any;
}) {
  const { transaction, body, user } = params;

  if (!body.embedTransaction || !body.embedTransaction.subscriptionId) {
    throw new InternalServerError(
      "Invalid Apple transaction: missing subscription information"
    );
  }
  const subscriptionId = body.embedTransaction.subscriptionId;
  console.log({ subscriptionId });
  const verificationResponse = await verifyAppleSubscription(subscriptionId);
  // console.log({ verificationResponse });
  if (!verificationResponse) {
    throw new InternalServerError("Failed to verify Apple subscription status");
  }

  // Map Apple's status to our system status using the utility function
  const newStatus = resolveTransactionStatusFromApple(verificationResponse);

  // Update transaction status
  const updateQuery = `
    UPDATE ${transaction.id} MERGE {
      status: "${newStatus}",
      lastVerified: time::now(),
      applePayment: {
        subscription_id: "${subscriptionId}",
        originalTransactionId: "${
          verificationResponse.originalTransactionId || ""
        }",
        lastTransactionId: "${verificationResponse.lastTransactionId || ""}",
        expiresDate: "${verificationResponse.expiresDate || ""}",
        environment: "${verificationResponse.environment}",
        status: "${verificationResponse.status}"
      }
    }
  `;

  const updateResult = await performQueryOnMasterDb(updateQuery);

  if (!updateResult || !updateResult[0]?.result?.[0]) {
    throw new InternalServerError("Failed to update Apple transaction status");
  }

  const updatedTransaction = updateResult[0].result[0];

  // If verification was successful, promote the user's plan
  if (newStatus === "completed") {
    const userPlanUpdateResult = await promoteUserPlan({
      id: user.userPlan.id,
      cycle: updatedTransaction.cycle,
      plan: updatedTransaction.plan,
      transactionId: updatedTransaction.id,
      paymentDate: updatedTransaction.createdAt
    });

    if (!userPlanUpdateResult || !userPlanUpdateResult[0]?.result?.[0]) {
      throw new InternalServerError(
        "Failed to update user plan after Apple verification"
      );
    }

    const updatedUserPlan = userPlanUpdateResult[0].result[0];
    return updatedUserPlan;
  }

  console.log({ newStatus });
  return {
    status: newStatus
  };
}

async function handleGoogleStoreVerification(params: {
  transaction: any;
  user: any;
}) {
  const { transaction, user } = params;
  console.log({ transaction });
  // Implementation would follow similar pattern to Apple verification
  throw new InternalServerError(
    "Google Store verification not implemented yet"
  );
}

async function handleMicrosoftStoreVerification(params: {
  transaction: any;
  user: any;
}) {
  const { transaction, user } = params;
  console.log({ transaction });
  // Implementation would follow similar pattern to Apple verification
  throw new InternalServerError(
    "Microsoft Store verification not implemented yet"
  );
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
