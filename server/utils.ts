import { extractProduct } from "$lib/shared/utils/utils";
import { performAdminQuery, performMasterQuery } from "./surrealHelpers";

export async function retrieveAppData(body: any) {
  //   console.log({ body });
  const product = extractProduct(body.app);
  //   console.log({ product });
  const query = `select * from product:${product.product}`;
  const queryResponseJson = await performMasterQuery(query);
  //   console.log({ queryResponseJson });
  const result = queryResponseJson[0].result[0];
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
    let createQuery = "";
    const product = extractProduct(app);
    const userResponseJson = await performMasterQuery(
      `select value meta::id(id) from user where email = "${email}" or emailhash = crypto::md5("${email}"); 
      select value meta::id(id) from product where urls.landing = "${app}";`
    );
    if (userResponseJson[1].result.length < 1) {
      return { error: "Product not found" };
    }
    if (userResponseJson[0].result.length > 0) {
      let userId = userResponseJson[0].result[0];
      createQuery = `relate product:${product.product}->subscribedBy->user:${userId} set context = "${context}", subscribedAt = time::now();`;
    } else {
      createQuery = `let $user = create user set createdAt = time::now(), email = "${email}"; relate product:${product.product}->subscribedBy->$user set context = "${context}", subscribedAt = time::now();`;
    }
    let result = await performAdminQuery(createQuery);
    console.log({ result, one: result?.[0]?.result });
    return result?.[0]?.result?.[0]?.subscribedAt;
  } catch (error) {
    console.log({ error });
    return { error: "An error occured", message: error };
  }
}

export async function retrieveUrlForShortener(slug: string) {
  console.log({ slug });
  try {
    const query = "select value url from slug:" + slug;
    const queryResponseJson = await performMasterQuery(query);
    console.log({ queryResponseJson });
    const result = queryResponseJson[0].result[0];
    return result;
  } catch (error) {
    console.log({ error });
    return { error: "An error occured", message: error };
  }
}
