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
  returnUrl?: string;
}) {
  const dodopayments = new DodoPayments({
    baseURL: process.env.DODO_BASE_URL ?? "https://test.dodopayments.com",
    bearerToken: process.env.DODO_API_KEY,
  });
  console.log({ email: params.email, name: params.name });
  const payment = await dodopayments.payments.create({
    billing: {
      city: "Hyderabad",
      country: "IN",
      state: "Telangana",
      street: "street",
      zipcode: "500085",
    },
    customer: {
      email: params.email ?? "test@21n.org",
      name: params.name ?? "someone",
    },
    payment_link: true,
    return_url: params.returnUrl ?? "",
    product_cart: [{ product_id: params.productId, quantity: 1 }],
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

export async function verifyPayment(paymentId: string) {
  const dodopayments = new DodoPayments({
    baseURL: process.env.DODO_BASE_URL ?? "https://test.dodopayments.com",
    bearerToken: process.env.DODO_API_KEY,
  });

  const payment = await dodopayments.payments.retrieve(paymentId);
  return payment;
}
