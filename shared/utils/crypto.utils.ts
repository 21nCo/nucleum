import fletcher16 from "fletcher";
import * as CryptoJS from "crypto-js";

export function generateHash(str: string) {
    return fletcher16(Buffer.from(str.toLowerCase())).toString();
}


export async function generateSHA256Hash(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
}