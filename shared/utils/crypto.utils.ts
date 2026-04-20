// import fletcher16 from "fletcher";

export function generateHashV1(str: string): void {
  // return fletcher16(Buffer.from(str.toLowerCase())).toString();
}
export function generateHash(str: string): string {
  let hash = 0;
  const input = str.toLowerCase();
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function generateSHA256Hash(message: string): Promise<string> {
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
export function generateContentHash(content: string): string {
  return CryptoJS.SHA256(content).toString();
}

export function generateRandomId(length = 16): string {
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Enhanced version of generateRandomId that adds timestamp-based entropy
 * and falls back to generateSimpleRandomId if crypto API fails
 */
export function generateRandomIdv2(length = 16): string {
  try {
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    const timestamp = Date.now().toString();
    const timestampBytes = new TextEncoder().encode(timestamp);

    for (let i = 0; i < Math.min(timestampBytes.length, length); i++) {
      randomValues[i] = (randomValues[i] + timestampBytes[i]) % 256;
    }

    return Array.from(randomValues)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (error) {
    console.warn(
      "Crypto API failed, using timestamp fallback for ID generation"
    );
    return generateSimpleRandomId();
  }
}

/**
 * Generates a simple unique identifier.
 */
export function generateSimpleRandomId(): string {
  return Date.now().toString(36) + generateRandomId(8);
}

export function generateMiniRandomId(): string {
  return generateRandomId(4);
}
