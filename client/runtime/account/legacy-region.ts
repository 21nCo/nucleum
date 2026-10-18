import { logger } from "@nucleum/client/runtime/logging/logger";

/** Selects the configured legacy regional API URL from the local timezone. */
export function resolveRegionalApiUrl() {
  try {
    const tzOffset = -new Date().getTimezoneOffset() * 60;
    if (tzOffset < -10800) {
      return (
        import.meta.env?.VITE_API_US_URL ??
        (typeof process !== "undefined"
          ? process.env?.PLASMO_PUBLIC_API_US_URL
          : undefined)
      );
    } else if (tzOffset > -10800 && tzOffset < 10800) {
      return (
        import.meta.env?.VITE_API_EU_URL ??
        (typeof process !== "undefined"
          ? process.env?.PLASMO_PUBLIC_API_EU_URL
          : undefined)
      );
    } else {
      return (
        import.meta.env?.VITE_API_AS_URL ??
        (typeof process !== "undefined"
          ? process.env?.PLASMO_PUBLIC_API_AS_URL
          : undefined)
      );
    }
  } catch (e) {
    console.warn("Error in resolveRegionalApiUrl", e);
  }
}

/** Selects the legacy region identifier from the local timezone. */
export function resolveRegionalApiUrlStrategy(): string {
  try {
    const tzOffset = -new Date().getTimezoneOffset() * 60;
    if (tzOffset <= -10800) {
      return "useast";
    } else if (tzOffset < 10800) {
      return "euwest";
    } else {
      return "insouth";
    }
  } catch (e) {
    console.warn("Error in resolveRegionalApiUrlStrategy", e);
    return "useast";
  }
}

type IPInfoResponse = {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  [key: string]: any;
};

function getIPInfoToken(): string {
  return import.meta.env?.VITE_IPINFO_TOKEN ?? "";
}

/**
 * Detects user's region based on their IP address using IPInfo API.
 * Requires VITE_IPINFO_TOKEN environment variable to be set.
 * Get your token at: https://ipinfo.io/
 * @param token - Optional token override for testing
 * @returns Region code (useast, euwest, insouth) or null if detection fails
 */
export async function detectUserRegionFromIP(
  token?: string
): Promise<string | null> {
  try {
    const ipinfoToken = token ?? getIPInfoToken();
    if (!ipinfoToken) {
      console.warn("IPInfo token not configured");
      return null;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://ipinfo.io/json?token=${ipinfoToken}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn("Failed to fetch IP info:", response.status);
        return null;
      }

      const data: IPInfoResponse = await response.json();
      return mapCountryToRegion(data.country);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.warn("IP info fetch timed out");
      } else {
        console.error("Error fetching IP info:", fetchError);
      }
      return null;
    }
  } catch (error) {
    console.error("Error detecting region from IP:", error);
    return null;
  }
}

function mapCountryToRegion(countryCode?: string): string | null {
  if (!countryCode) return null;

  const usCountries = ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE"];
  const euCountries = [
    "GB",
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
    "BE",
    "AT",
    "CH",
    "SE",
    "NO",
    "DK",
    "FI",
    "IE",
    "PT",
    "PL",
    "CZ",
    "RO",
    "GR",
    "HU",
    "BG",
    "SK",
    "SI",
    "HR",
    "EE",
    "LV",
    "LT",
    "LU",
    "MT",
    "CY",
    "RU",
    "UA",
    "TR",
    "IL",
    "SA",
    "AE",
    "ZA",
    "EG",
    "KE",
    "NG"
  ];
  const asiaCountries = [
    "IN",
    "CN",
    "JP",
    "KR",
    "SG",
    "MY",
    "TH",
    "ID",
    "PH",
    "VN",
    "AU",
    "NZ",
    "HK",
    "TW",
    "PK",
    "BD",
    "LK"
  ];

  if (usCountries.includes(countryCode)) return "useast";
  if (euCountries.includes(countryCode)) return "euwest";
  if (asiaCountries.includes(countryCode)) return "insouth";

  return null;
}

/**
 * Detects user's region using a two-tier strategy:
 * 1. Primary: IP-based detection using IPInfo API (requires VITE_IPINFO_TOKEN)
 * 2. Fallback: Timezone-based detection using browser timezone offset
 *
 * @returns Region code: 'useast' | 'euwest' | 'insouth'
 */
export async function detectUserRegion(): Promise<string> {
  const ipBasedRegion = await detectUserRegionFromIP();
  if (ipBasedRegion) {
    logger.debug({ at: "detectUserRegion.ip", region: ipBasedRegion });
    return ipBasedRegion;
  }

  const timezoneBasedRegion = resolveRegionalApiUrlStrategy();
  logger.debug({
    at: "detectUserRegion.timezone",
    region: timezoneBasedRegion
  });
  return timezoneBasedRegion;
}
