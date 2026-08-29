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
