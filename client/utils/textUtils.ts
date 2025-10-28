export function cleanText(text: string): string {
  return text
    .replace(/\(resource=[a-zA-Z]+:[a-zA-Z0-9_-]+\)/g, "")
    .replace(/\bresource:[a-zA-Z0-9_-]+\b/g, "")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^===+$/gm, "")
    .replace(/[​\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export function extractSearchFields(
  record: any,
  searchIndices: string[]
): Record<string, string> | undefined {
  try {
    const fields: Record<string, string> = {};
    let hasContent = false;

    for (const fieldName of searchIndices) {
      let value = record[fieldName];
      if (Array.isArray(value))
        value = value.filter((v) => v != null).join(" ");
      if (value && typeof value === "object") continue;
      if (value != null && value !== "") {
        const cleanedValue = cleanText(String(value));
        if (cleanedValue?.length > 0) {
          fields[fieldName] = cleanedValue;
          hasContent = true;
        }
      }
    }

    return hasContent ? fields : undefined;
  } catch (e) {
    console.error("Error extracting search fields:", e);
    return undefined;
  }
}
