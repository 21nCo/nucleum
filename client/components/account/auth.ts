import { createAuthClient } from "better-auth/svelte";
import {
  emailOTPClient,
  twoFactorClient,
  multiSessionClient,
  apiKeyClient
} from "better-auth/client/plugins";
import { clientStorage } from "@21n/persistence/persistence.utils";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { resolveAccountBaseUrl } from "../network";

function createAuthClientWithPlugins(region: string) {
  const baseURL = resolveAccountBaseUrl(region);
  const embedToken = localStorage.getItem("embedToken");
  return createAuthClient({
    baseURL,
    fetchOptions: embedToken
      ? {
          auth: {
            type: "Bearer",
            token: embedToken || ""
          }
        }
      : {},
    plugins: [
      emailOTPClient(),
      twoFactorClient(),
      multiSessionClient(),
      apiKeyClient()
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
  try {
    const client = await authClient({ isPreventCachedInstance: true });
    const session = await client.getSession();
    console.log("Better-auth session:", session);
    if (session?.data?.user) {
      await clientStorage.set(ClientStorageKey.USER, session.data.user);
    }
    return !!session?.data?.session;
  } catch (error) {
    console.error("Error checking better-auth session:", error);
  }
}

export function performSessionCheck(): Promise<boolean | undefined> {
  //TODO - offline user case
  return performCheckUsingSessionAPI();
}
