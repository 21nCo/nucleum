import { extractProduct } from "$lib/shared/utils/utils";
import { performQueryOnMasterDb } from "./surrealHelpers";

export async function retrieveAppConfig(app: string) {
  const product = extractProduct(app);
  const query = `select * from product:${product.product}`;
  const queryResponseJson = await performQueryOnMasterDb(query);
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
    const userResponseJson = await performQueryOnMasterDb(
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
    let result = await performQueryOnMasterDb(createQuery);
    console.log({ result, one: result?.[0]?.result });
    return result?.[0]?.result?.[0]?.subscribedAt;
  } catch (error) {
    console.log({ error });
    return { error: "An error occured", message: error };
  }
}

export async function performUtilRunAction(body: any, user: any) {
  try {
    if (!body.action) {
      return { error: "Action not specified" };
    }
    if (body.action === "get-webpage") {
      if (!body.url) {
        return { error: "URL not specified" };
      }
      return getWebpage(body.url);
    }
    return { error: "Action not supported" };
  } catch (error) {
    return { error: "An error occured", message: error };
  }

  async function getWebpage(url: string) {
    try {
      if (!isValidUrl(url)) {
        return { error: "Invalid URL" };
      }
      const response = await fetch(url);
      const text = await response.text();
      const headers = JSON.stringify(response.headers);

      return { text, headers };

      if (text.includes("<title>")) {
        return { text, headers };
      }
      // const browser = await puppeteer.launch({ headless: true });
      // const page = await browser.newPage();
      // await page.goto(url);

      // browser = await chromium.puppeteer.launch({
      //   args: chromium.args,
      //   defaultViewport: chromium.defaultViewport,
      //   executablePath: await chromium.executablePath,
      //   headless: chromium.headless,
      //   ignoreHTTPSErrors: true
      // });

      // let page = await browser.newPage();

      // await page.goto(url);

      // const title = await page.title();
      // const screenshot = await page.screenshot({ fullPage: true });
      // const content = await page.content();
      // await browser.close();
      // return { title, screenshot, content, headers };
    } catch (error) {
      return { error: "Invalid URL found", message: error };
    }
  }
}

function isValidUrl(url) {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" +
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
      "((\\d{1,3}\\.){3}\\d{1,3}))" +
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
      "(\\?[;&a-z\\d%_.~+=-]*)?" +
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );
  return urlPattern.test(url);
}
