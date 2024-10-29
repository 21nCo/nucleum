// import fletcher16 from "fletcher";

export function generateHash(str: string) {
  // return fletcher16(Buffer.from(str.toLowerCase())).toString();
}

export async function generateSHA256Hash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

/**
 * @deprecated - use generateHash or generateSHA256Hash instead
 * @param content
 * @returns
 */
export function generateContentHash(content: string) {
  return CryptoJS.SHA256(content).toString();
}

export function generateRandomId(length = 16) {
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a simple unique identifier.
 */
export function generateSimpleRandomId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}
