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
  const BATCH_SIZE = 5;
  const results: any[] = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        try {
          if (!isValidUrl(url)) {
            return { url, error: "Invalid URL" };
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; MetadataBot/1.0)"
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            return { url, error: `HTTP ${response.status}` };
          }

          const html = await response.text();
          const metadata = extractMetadataFromHtml(html, url);

          return { url, ...metadata };
        } catch (error) {
          if (error.name === "AbortError") {
            return { url, error: "Request timeout" };
          }
          return { url, error: "Failed to fetch URL", message: error.message };
        }
      })
    );

    const processedBatchResults = batchResults.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return { error: "Promise rejected", reason: result.reason };
      }
    });

    results.push(...processedBatchResults);

    if (i + BATCH_SIZE < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

function extractMetadataFromHtml(html: string, baseUrl: string) {
  const metadata: any = {};

  const titleMatch = html.match(/<title[^>]*>\s*([^<]{1,200}?)\s*<\/title>/i);
  metadata.title = titleMatch ? titleMatch[1].trim() : null;

  let faviconUrl = null;
  const faviconPatterns = [
    /<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']{1,500})["']/i,
    /<link[^>]*href=["']([^"']{1,500})["'][^>]*rel=["'](?:shortcut\s+)?icon["']/i
  ];

  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match) {
      faviconUrl = match[1];
      break;
    }
  }

  if (faviconUrl) {
    try {
      metadata.faviconUrl = faviconUrl.startsWith("http")
        ? faviconUrl
        : new URL(faviconUrl, baseUrl).href;
    } catch {
      metadata.faviconUrl = null;
    }
  } else {
    try {
      const baseURL = new URL(baseUrl);
      metadata.faviconUrl = `${baseURL.protocol}//${baseURL.host}/favicon.ico`;
    } catch {
      metadata.faviconUrl = null;
    }
  }

  const ogPattern =
    /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']{0,500})["'][^>]*>/gi;
  let ogMatch;
  while ((ogMatch = ogPattern.exec(html)) !== null) {
    const property = ogMatch[1];
    const content = ogMatch[2];
    if (property && content) {
      metadata[`og${property.charAt(0).toUpperCase() + property.slice(1)}`] =
        content;
    }
    if (ogPattern.lastIndex === 0) break;
  }

  const metaTagsConfig = [
    { name: "description", key: "description" },
    { name: "keywords", key: "keywords" },
    { name: "author", key: "author" },
    { name: "theme-color", key: "themeColor" },
    { name: "application-name", key: "applicationName" }
  ];

  for (const { name, key } of metaTagsConfig) {
    const pattern = new RegExp(
      `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']{0,500})["']`,
      "i"
    );
    const match = html.match(pattern);
    if (match && match[1]) {
      metadata[key] = match[1];
    }
  }

  const twitterPattern =
    /<meta[^>]*name=["']twitter:([^"']+)["'][^>]*content=["']([^"']{0,500})["'][^>]*>/gi;
  let twitterMatch;
  while ((twitterMatch = twitterPattern.exec(html)) !== null) {
    const property = twitterMatch[1];
    const content = twitterMatch[2];
    if (property && content) {
      metadata[
        `twitter${property.charAt(0).toUpperCase() + property.slice(1)}`
      ] = content;
    }
    if (twitterPattern.lastIndex === 0) break;
  }

  const canonicalMatch = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']{1,500})["']/i
  );
  metadata.canonicalUrl = canonicalMatch ? canonicalMatch[1] : null;

  const langMatch = html.match(/<html[^>]*lang=["']([^"']{1,20})["']/i);
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
