import { isValidUrl } from "./run.utils";

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
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      const headers = JSON.stringify(headersObj);

      return { text, headers };
    } catch (error) {
      return { error: "Invalid URL found", message: error };
    }
  }
}

function captureScreenshot(text: string) {
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
  //   if (text.includes("<title>")) {
  //     return { text, headers };
  //   }
}
