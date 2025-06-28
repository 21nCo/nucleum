import { extractProduct } from "$lib/shared/utils/utils";
import { DatabaseProviderFactory } from "$lib/server/database/providers";

export async function retrieveAppConfig(app: string) {
  const product = extractProduct(app);
  const provider = DatabaseProviderFactory.getProvider();
  const result = await provider.getProductConfig(product.product);
  let appData = {
    ...result,
    env: product.env,
    product: product.product
  };
  if (result.env?.[product.env]) {
    appData = { ...appData, ...result.env[product.env] };
  }
  return appData;
}

/**
 * Create a subscription for a user to a product.
 * @param body
 * @returns
 */
export async function saveSubscription(body: any) {
  try {
    const { email, app, context } = body;
    const product = extractProduct(app);
    const subscriptionData = {
      email,
      app,
      context,
      productId: product.product
    };
    const provider = DatabaseProviderFactory.getProvider();
    let result = await provider.createSubscription(subscriptionData);
    console.log({ result, one: result?.[0]?.result });
    return result?.[0]?.result?.[0]?.subscribedAt;
  } catch (error) {
    console.log({ error });
    return { error: "An error occured", message: error };
  }
}
