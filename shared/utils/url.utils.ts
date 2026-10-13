import { isValidEmail } from "@21n/shared-utils/text.utils";

/** Returns a URL only when it uses a safe protocol or a relative form. */
export function sanitizeUrl(
  url: string | undefined | null
): string | undefined {
  if (!url || typeof url !== "string") {
    return undefined;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return undefined;
  }

  if (
    trimmedUrl.startsWith("/") ||
    trimmedUrl.startsWith("./") ||
    trimmedUrl.startsWith("../") ||
    trimmedUrl.startsWith("#") ||
    trimmedUrl.startsWith("?")
  ) {
    return trimmedUrl;
  }

  const safeProtocols = ["https:", "http:", "mailto:", "tel:"];

  try {
    const urlObject = new URL(trimmedUrl);
    if (safeProtocols.includes(urlObject.protocol)) {
      return trimmedUrl;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/** Checks whether a value is an HTTP URL with a host. */
export function isValidUrl(url: any): boolean {
  if (url === undefined || url === null) {
    return false;
  }

  try {
    const urlObj = new URL(String(url));
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }
    const hostname = urlObj.hostname;
    if (!hostname || hostname.endsWith(".") || !hostname.includes(".")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Checks whether text can be interpreted as a web URL. */
export function isUrlMatchPattern(url: string) {
  if (!url || /\s/.test(url)) return false;

  try {
    const value = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (parsed.username || parsed.password) return false;
    const hostname = parsed.hostname;
    const typedHost = value
      .replace(/^(?:https?:)?\/\//i, "")
      .split(/[/?#]/)[0]
      .replace(/:\d+$/, "")
      .toLowerCase();
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && typedHost !== hostname)
      return false;
    return Boolean(
      hostname && !hostname.endsWith(".") && hostname.includes(".")
    );
  } catch {
    return false;
  }
}

/** Accepts a web URL or email address as a hyperlink. */
export function isValidHyperlink(url: string) {
  const isUrl = isValidUrl(url);
  const isEmail = isValidEmail(url);
  return isUrl || isEmail;
}
