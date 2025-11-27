import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { clientStorage } from "@21n/persistence/persistence.utils";

export function resolveHost() {
  return import.meta.env?.VITE_HOST ?? window.location.hostname;
}

export function resolveAccountBaseUrl(region: string) {
  const hostNameParts = resolveHost().split(".");
  const domain = hostNameParts.slice(1).join(".");
  const subDomain = hostNameParts[0] ?? "dev";
  const baseURL = `https://account-${region}${subDomain === "web" ? "" : "-" + subDomain}.${domain}`;
  console.log({ baseURL });
  // return "http://localhost:3000";
  return baseURL;
}

export async function peformAccountApiCall(
  path: string,
  body: any,
  params?: {
    method?: "POST" | "GET" | "PUT" | "DELETE";
    region?: string;
    headers?: any;
  }
) {
  const region =
    params?.region ?? (await clientStorage.get(ClientStorageKey.REGION));
  const baseUrl = resolveAccountBaseUrl(region ?? "insouth");
  return fetch(baseUrl + "/" + path, {
    method: params?.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(params?.headers ?? {})
    },
    body: JSON.stringify(body)
  });
}
