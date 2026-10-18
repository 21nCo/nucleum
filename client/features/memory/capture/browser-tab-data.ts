import type { OmitForCapture } from "@nucleum/datafn/resource.type";
import type { INode } from "@nucleum/features/memory/node/node.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { contentTypeMap } from "@nucleum/features/memory/node/url.utils";
import { generateSHA256Hash } from "@21n/shared-utils/crypto.utils";

/** Extracts capture metadata from a live tab or a parsed HTML document. */
export async function extractFullTabData(
  doc?: Document,
  params?: {
    url?: string;
    docText?: string;
  }
): Promise<OmitForCapture<INode>> {
  doc = doc ?? document;
  const title = doc.title;
  const faviconLink = (
    doc.querySelector("link[rel*='icon']") as HTMLLinkElement
  )?.href;
  const appIconLinks = Array.from(
    doc.querySelectorAll("link[rel='apple-touch-icon']"),
    (link) => (link as HTMLLinkElement).href
  );
  const description = (
    doc.querySelector("meta[name='description']") as HTMLMetaElement
  )?.content;
  const keywords = (
    doc.querySelector("meta[name='keywords']") as HTMLMetaElement
  )?.content;
  const twitterCard = (
    doc.querySelector("meta[name='twitter:card']") as HTMLMetaElement
  )?.content;
  const { ogTitle, ogImage, ogDescription, ogUrl } = resolveOgData(doc);
  const browser = extractBrowserDetails();
  const hash = await generateSHA256Hash(doc.body?.innerHTML ?? params?.docText);
  const url = params?.url ? resolveUrl(params.url) : resolveUrl();
  const contentType = resolveContentTypeForUrl(url);
  return {
    label: title,
    contentType,
    url,
    body: {
      hash,
      description
    },
    metadata: {
      faviconLink,
      appIconLinks,
      keywords,
      ogImage,
      ogTitle,
      ogDescription,
      ogUrl,
      twitterCard,
      browser
    }
  } as OmitForCapture<INode>;
}

/** Normalizes a browser page URL for captured resources. */
export function resolveUrl(url?: string) {
  if (!url) url = window.location.href;
  url = url.split("#")[0];
  const hostname = new URL(url, window.location.href).hostname.toLowerCase();
  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    return url.split("&")[0];
  }
  return url;
}

/** Reads Open Graph metadata from a live or parsed document. */
export function resolveOgData(doc?: Document) {
  doc = doc ?? document;
  const ogTitle = (
    doc.querySelector("meta[property='og:title']") as HTMLMetaElement
  )?.content;
  const ogImage = (
    doc.querySelector("meta[property='og:image']") as HTMLMetaElement
  )?.content;
  const ogDescription = (
    doc.querySelector("meta[property='og:description']") as HTMLMetaElement
  )?.content;
  const ogUrl = (
    doc.querySelector("meta[property='og:url']") as HTMLMetaElement
  )?.content;
  const ogSiteName = (
    doc.querySelector("meta[property='og:site_name']") as HTMLMetaElement
  )?.content;
  return { ogTitle, ogImage, ogDescription, ogUrl, ogSiteName };
}

/** Selects the memory node content type for a page URL. */
export function resolveContentTypeForUrl(url: string) {
  return (
    contentTypeMap.find((item) => item.regex.some((regex) => regex.test(url)))
      ?.contentType ?? NodeType.WEB_PAGE
  );
}

/** Returns cloneable browser metadata for captured pages. */
export function extractBrowserDetails() {
  const userAgent = navigator.userAgent;
  return { userAgent };
}
