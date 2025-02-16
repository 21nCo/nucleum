import { paymentProductsList } from "./paymentProducts";

export function resolvePlanQuery(userId: string) {
  return `select id, context, userPlan.* as userPlan from user:${userId};`;
}

export function resolveDodoProductId({
  plan,
  cycle,
  discount,
}: {
  plan: string;
  cycle: string;
  discount: number;
}) {
  const product = paymentProductsList.find(
    (product) =>
      product.plan === plan &&
      product.cycle === cycle &&
      (!product.discount || product.discount === discount)
  );
  console.log({ product, plan, cycle, discount });
  return product?.dodoProductId;
}
