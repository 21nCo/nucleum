import DodoPayments from "dodopayments";

export async function createCustomer(params: { email: string; name: string }) {
  const dodopayments = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY,
  });
  console.log({ email: params.email, name: params.name });
  const customer = await dodopayments.customers.create({
    email: params.email ?? "test@21n.org",
    name: params.name ?? "someone",
  });
  return customer;
}

export async function createPayment(params: {
  productId: string;
  email: string;
  name: string;
  billing: any;
  returnUrl?: string;
}) {
  const dodopayments = new DodoPayments({
    baseURL: process.env.DODO_BASE_URL ?? "https://test.dodopayments.com",
    bearerToken: process.env.DODO_API_KEY,
  });
  console.log({ email: params.email, name: params.name });
  const payment = await dodopayments.payments.create({
    billing: params.billing,
    customer: {
      email: params.email,
      name: params.name,
    },
    payment_link: true,
    return_url: params.returnUrl ?? "",
    product_cart: [{ product_id: params.productId, quantity: 1 }],
  });
  return payment;
}

export async function createSubscription(params: {
  productId: string;
  email: string;
  name: string;
  billing: any;
  returnUrl?: string;
}) {
  const dodopayments = new DodoPayments({
    baseURL: process.env.DODO_BASE_URL ?? "https://test.dodopayments.com",
    bearerToken: process.env.DODO_API_KEY,
  });
  console.log({ email: params.email, name: params.name });
  const payment = await dodopayments.subscriptions.create({
    billing: params.billing,
    customer: {
      email: params.email,
      name: params.name,
    },
    payment_link: true,
    return_url: params.returnUrl ?? "",
    product_id: params.productId,
    quantity: 1,
  });
  return payment;
}

export async function createPaymentUsingHttp(params: {
  productId: string;
  email: string;
  name: string;
}) {
  const response = await fetch("https://test.dodopayments.com/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      billing: {
        city: "Hyderabad",
        country: "IN",
        state: "Telangana",
        street: "street",
        zipcode: "500085",
      },
      payment_link: true,
      customer: { email: params.email, name: params.name },
      product_cart: [{ product_id: params.productId, quantity: 1 }],
    }),
  });
  console.log({ response });
  return response.json();
}

export async function verifyPayment(id: string, isSubscription?: boolean) {
  const dodopayments = new DodoPayments({
    baseURL: process.env.DODO_BASE_URL ?? "https://test.dodopayments.com",
    bearerToken: process.env.DODO_API_KEY,
  });
  if (isSubscription) {
    const payment = await dodopayments.subscriptions.retrieve(id);
    return payment;
  }
  const payment = await dodopayments.payments.retrieve(id);
  return payment;
}

export async function cancelSubscription(subscriptionId: string) {
  const dodopayments = new DodoPayments({
    baseURL: process.env.DODO_BASE_URL ?? "https://test.dodopayments.com",
    bearerToken: process.env.DODO_API_KEY,
  });
  const subscription = await dodopayments.subscriptions.update(subscriptionId, {
    status: "cancelled",
  });
  return subscription;
}

export async function refundPayment(paymentId: string, amount?: number) {
  const dodopayments = new DodoPayments({
    baseURL: process.env.DODO_BASE_URL ?? "https://test.dodopayments.com",
    bearerToken: process.env.DODO_API_KEY,
  });
  const refund = await dodopayments.refunds.create({
    payment_id: paymentId,
    amount,
  });
  return refund;
}
