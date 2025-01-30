import { isValidUrl } from "$lib/shared/utils/utils";

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
    } else if (body.action === "unsplash-browse") {
      return unsplashBrowse(body);
    } else if (body.action === "unsplash-download") {
      return unsplashDownload(body);
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

async function unsplashBrowse(body: any) {
  const { query, page, perPage } = body;
  const endpoint = query
    ? `https://api.unsplash.com/search/photos?query=${query}&page=${page}&per_page=${perPage}`
    : `https://api.unsplash.com/photos?page=${page}&per_page=${perPage}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
    },
  });

  const data = await response.json();
  return data;
}

async function unsplashDownload(body: any) {
  const { url } = body;
  const clientId = process.env.UNSPLASH_ACCESS_KEY;
  const response = await fetch(url + `?client_id=${clientId}`);
  const data = await response.json();
  return data;
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
