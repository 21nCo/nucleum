/**
 * Sanitizes URLs to prevent XSS attacks
 * Only allows safe protocols: https, http, mailto, tel, and relative paths
 */
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

  // Check for safe protocols
  const safeProtocols = ["https:", "http:", "mailto:", "tel:"];

  try {
    const urlObj = new URL(trimmedUrl);
    if (safeProtocols.includes(urlObj.protocol)) {
      return trimmedUrl;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
}
