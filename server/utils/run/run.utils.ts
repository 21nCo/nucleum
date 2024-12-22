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
