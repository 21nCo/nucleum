const SAFE_MARKDOWN_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

/** Returns a safe absolute or relative URL for rendered Markdown links. */
export function sanitizeMarkdownUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) return undefined;
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return undefined;
  if (
    trimmedUrl.startsWith("/") ||
    trimmedUrl.startsWith("./") ||
    trimmedUrl.startsWith("../") ||
    trimmedUrl.startsWith("#") ||
    trimmedUrl.startsWith("?")
  ) {
    return trimmedUrl;
  }
  try {
    const parsedUrl = new URL(trimmedUrl);
    return SAFE_MARKDOWN_PROTOCOLS.has(parsedUrl.protocol)
      ? trimmedUrl
      : undefined;
  } catch {
    return undefined;
  }
}
