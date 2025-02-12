import { performQueryOnMasterDb } from "$lib/server/surrealHelpers";
import {
  generateRandomId,
  generateSHA256Hash,
} from "$lib/shared/utils/crypto.utils";
import { generateUID } from "$lib/shared/utils/utils";
import { Agent } from "../../account/account.type";
import { InternalServerError, ValidationError } from "../../errors";
import {
  createCustomer,
  createPayment,
  createPaymentUsingHttp,
} from "../dodoPaymentProvider";
import { resolveDodoProductId, resolvePlanQuery } from "../plan.utils";

export async function subscribe(body: any, agent: Agent) {
  if (!body) throw new ValidationError("No body provided");
  if (!body.action) {
    return await newSubscription(body, agent);
  }
}

async function newSubscription(body: any, agent: Agent) {
  const { plan, cycle } = body;
  if (!plan) throw new ValidationError("No plan provided");
  if (!cycle) throw new ValidationError("No cycle provided");
  const userDataResult = await performQueryOnMasterDb(
    resolvePlanQuery(agent.id)
  );
  if (!userDataResult || !userDataResult[0])
    throw new ValidationError("User not found");
  const user = userDataResult[0].result?.[0];

  if (!user || !user.userPlan) throw new InternalServerError("User not found");

  let discount = 0;
  const discountData = user.userPlan.discount;
  if (discountData.first) {
    discount = discountData.first;
  }
  const productId = resolveDodoProductId({ plan, cycle, discount });
  console.log({ user, productId, discount });
  if (!productId) throw new InternalServerError("Product not found");

  const nonce = await generateSHA256Hash(
    `${agent.id}-${productId}-${plan}-${cycle}`
  );
  const transaction = await createTransaction({
    productId,
    userId: agent.id,
    plan,
    cycle,
    discount,
    nonce,
    status: "pending",
  });
  console.log({ transaction });
  if (Array.isArray(transaction) && transaction.length > 0) {
    const transactionId = transaction[0].result?.[0]?.id;
    console.log({ transactionId });
    if (!transactionId)
      throw new InternalServerError("Transaction not created");
  }

  // const customer = await createCustomer({
  //   email: user.context.oauthData.email,
  //   name: user.nickName,
  // });
  // console.log({ customer });
  const payment = await createPaymentUsingHttp({
    email: user.context.oauthData.email,
    name: user.nickName,
    productId,
  });
  console.log({ payment });
  //4. create subscription in dodo
  //5. return subscription id

  // Temporary mock return for tests
  return {
    subscriptionId: "mock-subscription-id",
    plan,
    cycle,
    status: "active",
  };
}

async function createTransaction(params: {
  productId: string;
  userId: string;
  plan: string;
  cycle: string;
  discount: number;
  nonce: string;
  status: "pending" | "completed" | "cancelled" | "failed";
}) {
  const query = `
    INSERT INTO transaction [{ userId: user:${params.userId}, productId: "${params.productId}", plan: "${params.plan}", cycle: "${params.cycle}", discount: ${params.discount}, status: "${params.status}", nonce: "${params.nonce}"}]`;
  const transaction = await performQueryOnMasterDb(query);
  return transaction;
}
