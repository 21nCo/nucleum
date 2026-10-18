import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";

/** Resolves a host-specific application environment variable. */
export function getEnvVal(
  key: string,
  dataType: "string" | "number" = "string"
) {
  try {
    const isExtension = isExtensionEnvironment();
    if (isExtension) {
      key = "PLASMO_PUBLIC_" + key;
      if (dataType === "string")
        return typeof process !== "undefined" ? process?.env?.[key] : undefined;
      else if (
        dataType === "number" &&
        typeof process !== "undefined" &&
        process?.env?.[key]
      )
        return Number(process.env[key]);
      else return null;
    }
    key = "VITE_" + key;
    if (dataType === "string") return import.meta.env[key];
    else if (dataType === "number" && import.meta.env[key])
      return Number(import.meta.env[key]);
    else return null;
  } catch (e) {
    console.error({ at: "getEnvVal", error: e, key });
    return null;
  }
}
