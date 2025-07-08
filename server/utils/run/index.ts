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
    } else if (body.action === "get-multiple-webpage-metadata") {
      if (!body.urls || !Array.isArray(body.urls)) {
        return { error: "URLs array not specified" };
      }
      return getMultipleWebpageMetadata(body.urls);
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
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
    }
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

async function getMultipleWebpageMetadata(urls: string[]) {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        if (!isValidUrl(url)) {
          return { url, error: "Invalid URL" };
        }

        const response = await fetch(url);
        const html = await response.text();
        const metadata = extractMetadataFromHtml(html, url);

        return { url, ...metadata };
      } catch (error) {
        return { url, error: "Failed to fetch URL", message: error };
      }
    })
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return { error: "Promise rejected", reason: result.reason };
    }
  });
}

function extractMetadataFromHtml(html: string, baseUrl: string) {
  const metadata: any = {};

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  metadata.title = titleMatch ? titleMatch[1].trim() : null;

  const faviconMatches = [
    html.match(
      /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i
    ),
    html.match(
      /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i
    )
  ];
  const faviconMatch = faviconMatches.find((match) => match);
  if (faviconMatch) {
    const faviconUrl = faviconMatch[1];
    metadata.faviconUrl = faviconUrl.startsWith("http")
      ? faviconUrl
      : new URL(faviconUrl, baseUrl).href;
  } else {
    try {
      const baseURL = new URL(baseUrl);
      metadata.faviconUrl = `${baseURL.protocol}//${baseURL.host}/favicon.ico`;
    } catch {
      metadata.faviconUrl = null;
    }
  }

  const ogTags =
    html.match(
      /<meta[^>]*property=["']og:([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi
    ) || [];
  ogTags.forEach((tag) => {
    const propertyMatch = tag.match(/property=["']og:([^"']*)["']/i);
    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (propertyMatch && contentMatch) {
      const property = propertyMatch[1];
      const content = contentMatch[1];
      metadata[`og${property.charAt(0).toUpperCase() + property.slice(1)}`] =
        content;
    }
  });

  const metaTags = [
    { name: "description", key: "description" },
    { name: "keywords", key: "keywords" },
    { name: "author", key: "author" },
    { name: "viewport", key: "viewport" },
    { name: "theme-color", key: "themeColor" },
    { name: "application-name", key: "applicationName" },
    { name: "apple-mobile-web-app-title", key: "appleMobileWebAppTitle" }
  ];

  metaTags.forEach(({ name, key }) => {
    const metaMatch = html.match(
      new RegExp(
        `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`,
        "i"
      )
    );
    if (metaMatch) {
      metadata[key] = metaMatch[1];
    }
  });

  const twitterTags =
    html.match(
      /<meta[^>]*name=["']twitter:([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi
    ) || [];
  twitterTags.forEach((tag) => {
    const nameMatch = tag.match(/name=["']twitter:([^"']*)["']/i);
    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (nameMatch && contentMatch) {
      const property = nameMatch[1];
      const content = contentMatch[1];
      metadata[
        `twitter${property.charAt(0).toUpperCase() + property.slice(1)}`
      ] = content;
    }
  });

  const canonicalMatch = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i
  );
  metadata.canonicalUrl = canonicalMatch ? canonicalMatch[1] : null;

  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  metadata.language = langMatch ? langMatch[1] : null;

  return metadata;
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
