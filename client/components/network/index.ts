import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { clientStorage } from "@21n/persistence/persistence.utils";

export function resolveHost() {
  return import.meta.env?.VITE_HOST ?? window.location.hostname;
}

export function resolveAccountBaseUrl(region: string) {
  const host = resolveHost();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    return "http://localhost:3000";
  }

  const hostNameParts = host.split(".");
  if (hostNameParts.length < 2) {
    return import.meta.env?.VITE_ACCOUNT_BASE_URL ?? "http://localhost:3000";
  }
  const domain = hostNameParts.slice(1).join(".");
  const subDomain = hostNameParts[0] ?? "dev";
  const baseURL = `https://account-${region}${subDomain === "web" ? "" : "-" + subDomain}.${domain}`;
  console.log({ baseURL });
  return baseURL;
}

export async function peformAccountApiCall(
  path: string,
  body: any,
  params?: {
    method?: "POST" | "GET" | "PUT" | "DELETE" | "HEAD";
    region?: string;
    headers?: any;
  }
) {
  const region =
    params?.region ?? (await clientStorage.get(ClientStorageKey.REGION));
  const baseUrl = resolveAccountBaseUrl(region ?? "insouth");
  const method = params?.method ?? "POST";
  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(params?.headers ?? {})
    }
  };

  if (method !== "GET" && method !== "HEAD") {
    fetchOptions.body = JSON.stringify(body);
  }

  return fetch(baseUrl + "/" + path, fetchOptions);
}
