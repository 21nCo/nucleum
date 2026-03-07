import { createAuthClient } from "better-auth/svelte";
import {
  emailOTPClient,
  twoFactorClient,
  multiSessionClient
} from "better-auth/client/plugins";
import { clientStorage } from "@21n/persistence/persistence.utils";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { resolveAccountBaseUrl } from "../network";

function createAuthClientWithPlugins(region: string) {
  const baseURL = resolveAccountBaseUrl(region);
  const embedToken =
    typeof window !== "undefined" ? localStorage.getItem("embedToken") : null;
  return createAuthClient({
    baseURL,
    fetchOptions: embedToken
      ? {
          credentials: "include",
          auth: {
            type: "Bearer",
            token: embedToken
          }
        }
      : {
          credentials: "include"
        },
    plugins: [
      emailOTPClient(),
      twoFactorClient(),
      multiSessionClient()
    ]
  });
}

type AuthClient = ReturnType<typeof createAuthClientWithPlugins>;
const authClientsMap: Map<string, AuthClient> = new Map();

export const authClient = async (params?: {
  region?: string;
  isPreventCachedInstance?: boolean;
}): Promise<AuthClient> => {
  let region = params?.region;
  if (!region)
    region = (await clientStorage.get(ClientStorageKey.REGION)) ?? "insouth";
  if (authClientsMap.has(region) && !params?.isPreventCachedInstance) {
    return authClientsMap.get(region) as AuthClient;
  }
  const client = createAuthClientWithPlugins(region);
  authClientsMap.set(region, client);
  return client;
};

async function performCheckUsingSessionAPI() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const client = await authClient({ isPreventCachedInstance: true });
    const session = await client.getSession();
    if (session?.data?.user) {
      await clientStorage.set(ClientStorageKey.USER, session.data.user);
    }
    return !!session?.data?.session;
  } catch (error) {
    console.error("Error checking better-auth session:", error);
    return undefined;
  }
}

export function performSessionCheck(): Promise<boolean | undefined> {
  //TODO: Implement offline user case
  return performCheckUsingSessionAPI();
}
