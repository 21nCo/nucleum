import { goto } from "@nucleum/client/runtime/navigation/navigation-request";
import { navigation } from "@nucleum/shell/navigation/navigation";
import { type IUserPlan } from "@nucleum/schema/account/subscription";
import {
  UserDataMode,
  UserSessionType,
  type UserAccount,
  type UserInformation
} from "@nucleum/client/runtime/account/account.type";
import account from "@nucleum/client/runtime/account/account.store";
import {
  resolveStoredUserInformation,
  resolveStoredUserPlan
} from "@nucleum/client/runtime/account/account-storage";
import { postDataToParent } from "@nucleum/client/runtime/embed/embed.utils";
import { legacyAccountTransport } from "@nucleum/client/runtime/account/legacy-account-transport";
import { subscriptionTransport } from "@nucleum/client/runtime/account/subscription-transport";
import { signout } from "@nucleum/client/runtime/account/session-cleanup";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { destroyNucleumDatafn } from "@nucleum/datafn/datafn.store";
import { EmbedDataMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";
import { parse } from "@21n/shared-utils/json.utils";
import {
  bootstrapNucleusAccount,
  resolveAuthSession,
  shouldUseAuthFnBearerSession
} from "@nucleum/client/runtime/account/auth";
import { resolveAccountBaseUrl } from "@nucleum/client/runtime/account/network";
import { clearCachedDatafnE2eeState } from "@nucleum/datafn/datafnE2ee.store";
import { determineIfOffline } from "@nucleum/client/runtime/connectivity";

async function postToEmbed(data: any = null) {
  if (!data) {
    const token = shouldUseAuthFnBearerSession()
      ? await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)
      : undefined;
    const userInfo = parse(
      (await clientStorage.get(ClientStorageKey.USER_INFO)) ?? ""
    );
    data = { token, userInfo };
  }
  if (!data) return;
  postDataToParent(EmbedDataMessage.ACCOUNT, {
    userId: data.userInfo?.id?.split("user:")[1],
    token: data.token,
    regionId: data.userInfo?.region,
    accountUrl: data.userInfo?.region
      ? resolveAccountBaseUrl(data.userInfo.region)
      : undefined,
    isLoggedIn: true
  });
}

async function init() {
  const seed: UserAccount = {
    dataMode: UserDataMode.NONE,
    sessionType: UserSessionType.UNDETERMINED
  };
  const shouldUseBearerSession = shouldUseAuthFnBearerSession();
  const authFnToken = shouldUseBearerSession
    ? await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)
    : null;
  const offlineSessionId = await clientStorage.get(
    ClientStorageKey.OFFLINE_SESSION_ID
  );
  const storedUserInfo = await clientStorage.get(ClientStorageKey.USER_INFO);
  const userInfo = resolveStoredUserInformation(storedUserInfo);
  const storedPlan = resolveStoredUserPlan(
    await clientStorage.get(ClientStorageKey.USER_PLAN)
  );
  const storedUser = await clientStorage.get(ClientStorageKey.USER);
  const hasStoredCloudIdentity = Boolean(authFnToken || userInfo || storedUser);
  if (!shouldUseBearerSession) {
    await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
  }
  if (authFnToken) {
    seed.token = authFnToken;
    seed.dataMode = UserDataMode.CLOUD;
    seed.sessionType = UserSessionType.RETURNING;
  } else if (offlineSessionId && !hasStoredCloudIdentity) {
    seed.dataMode = UserDataMode.LOCAL;
    seed.sessionType = UserSessionType.RETURNING;
  }
  if (userInfo) {
    seed.userInfo = userInfo;
    seed.userId = userInfo.id.split("user:")[1];
    seed.plan = storedPlan;
    seed.dataMode = UserDataMode.CLOUD;
    seed.sessionType = UserSessionType.RETURNING;
  }
  account.set(seed);
  postToEmbed(seed);
}

async function signIn(
  data: {
    userInfo: UserInformation;
    token: string;
  },
  params: {
    isNewUser?: boolean;
    persistToken?: boolean;
  } = { isNewUser: false }
) {
  const shouldPersistToken =
    params.persistToken ?? shouldUseAuthFnBearerSession();
  if (shouldPersistToken) {
    await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, data.token);
  } else {
    await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
  }
  await clientStorage.remove(ClientStorageKey.STOKEN);
  await clientStorage.set(ClientStorageKey.USER_INFO, data.userInfo);
  postToEmbed({
    token: shouldPersistToken ? data.token : undefined,
    userInfo: data.userInfo
  });
  account.update(() => ({
    token: shouldPersistToken ? data.token : undefined,
    dataMode: UserDataMode.CLOUD,
    userId: data.userInfo.id.split("user:")[1],
    userInfo: data.userInfo,
    sessionType: params.isNewUser
      ? UserSessionType.NEW
      : UserSessionType.RETURNING
  }));
  gotoPostAuthRoute({ isNewUser: params.isNewUser });
}

function gotoPostAuthRoute(params?: { isNewUser?: boolean }) {
  const targetPath = params?.isNewUser ? "/onboarding" : "/";
  logger.info({
    at: "account.gotoPostAuthRoute",
    targetPath,
    isNewUser: params?.isNewUser,
    currentPath:
      typeof window !== "undefined" ? window.location.pathname : undefined
  });
  navigation.gotoPath(targetPath);
}

async function signOut(params?: {
  isPreventDapIdClear?: boolean;
  isPreventRedirect?: boolean;
}) {
  try {
    await destroyNucleumDatafn();
  } catch (error) {
    logger.error({ at: "account.signOut.destroyDatafn", error });
  }
  await clearCachedDatafnE2eeState();
  account.update(() => ({
    sessionType: UserSessionType.UNDETERMINED,
    dataMode: UserDataMode.NONE
  }));
  await signout(params, "signOut account.store");
  if (!params?.isPreventRedirect) goto("/account/login");
}

function resolveUserInfoFromAuthFnSession(session: any): UserInformation {
  const metadata = (session.metadata ?? {}) as {
    nucleus?: {
      isBootstrapped?: boolean;
      nickName?: string;
      profilePictureUrl?: string;
    };
  };
  const subject = session.subject ?? {};
  const email = session.primaryEmail ?? subject.email ?? "";
  const actorId = String(session.actorId ?? "");
  const id = actorId.startsWith("user:") ? actorId : `user:${actorId}`;
  return {
    id,
    email,
    nickName: metadata.nucleus?.nickName ?? email.split("@")[0] ?? "",
    joinDate: new Date(),
    lastLogin: new Date(),
    profilePictureUrl: metadata.nucleus?.profilePictureUrl,
    isBootstrapped: metadata.nucleus?.isBootstrapped ?? false,
    region: session.regionId ?? subject.regionId
  };
}

async function resolveAuthFnSessionUserInfo(): Promise<{
  userInfo: UserInformation;
} | null> {
  const { authClient } = await import("@nucleum/client/runtime/account/auth");
  const response = await (await authClient()).getSession();
  if (!response.ok || !response.data.session) return null;
  return {
    userInfo: resolveUserInfoFromAuthFnSession(response.data.session)
  };
}

async function embedOAuthSignin(token: string) {
  await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, token);
  await clientStorage.remove(ClientStorageKey.STOKEN);
  const response = await resolveAuthFnSessionUserInfo();
  if (response?.userInfo) {
    void signIn({ userInfo: response.userInfo, token });
  } else {
    logger.error({ at: "account.embedOAuthSignin", response });
  }
}

async function signInFromAuthFnSession(params?: {
  token?: string;
  session?: any;
  regionId?: string;
  isNewUser?: boolean;
  isPreventRedirect?: boolean;
  persistToken?: boolean;
}) {
  const shouldPersistToken =
    params?.persistToken ?? shouldUseAuthFnBearerSession();
  const previousAuthFnToken = shouldPersistToken
    ? await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)
    : undefined;
  const hasTokenFromResponse = Boolean(params?.token?.trim());
  if (shouldPersistToken && hasTokenFromResponse && params?.token) {
    await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, params.token);
  } else if (!shouldPersistToken) {
    await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
  }
  if (params?.regionId) {
    await clientStorage.set(ClientStorageKey.REGION, params.regionId);
  }

  let authSession = params?.session;
  if (!authSession) {
    const { authClient } = await import("@nucleum/client/runtime/account/auth");
    const response = await (
      await authClient({ isPreventCachedInstance: true })
    ).getSession();
    if (response.ok && response.data.session) {
      authSession = response.data.session;
    }
    if (!response.ok || !response.data.session) {
      logger.error({
        at: "account.signInFromAuthFnSession.session.failed",
        hasTokenFromResponse,
        error: response.ok ? undefined : response.error
      });
    }
  }

  if (!authSession) {
    if (shouldPersistToken && hasTokenFromResponse) {
      if (previousAuthFnToken) {
        await clientStorage.set(
          ClientStorageKey.AUTHFN_TOKEN,
          previousAuthFnToken
        );
      } else {
        await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
      }
    }
    return false;
  }

  const sessionToken = shouldPersistToken
    ? (params?.token ?? previousAuthFnToken ?? undefined)
    : undefined;
  if (shouldPersistToken && sessionToken) {
    await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, sessionToken);
  } else {
    await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
  }
  await clientStorage.remove(ClientStorageKey.STOKEN);
  await clientStorage.set(ClientStorageKey.USER, authSession);

  const userInfo = resolveUserInfoFromAuthFnSession(authSession);
  await clientStorage.set(ClientStorageKey.USER_INFO, userInfo);
  postToEmbed({ token: sessionToken, userInfo });
  account.update(() => ({
    token: sessionToken,
    dataMode: UserDataMode.CLOUD,
    sessionType: params?.isNewUser
      ? UserSessionType.NEW
      : UserSessionType.RETURNING,
    userId: userInfo.id.split("user:")[1],
    userInfo
  }));

  logger.info({
    at: "account.signInFromAuthFnSession.ok",
    hasSessionToken: Boolean(sessionToken),
    isNewUser: params?.isNewUser,
    isPreventRedirect: params?.isPreventRedirect,
    userId: userInfo.id,
    region: userInfo.region,
    dataMode: UserDataMode.CLOUD,
    currentPath:
      typeof window !== "undefined" ? window.location.pathname : undefined
  });

  if (params?.isPreventRedirect) return true;
  gotoPostAuthRoute({ isNewUser: params?.isNewUser });
  return true;
}

async function refreshPlanData() {
  try {
    const isOffline = await determineIfOffline();
    if (isOffline) return { status: "unavailable" as const };
    const response = await subscriptionTransport.getUserPlan();
    if (response === undefined) {
      return { status: "unavailable" as const };
    }
    const data = Array.isArray(response) ? response[0]?.result?.[0] : response;
    if (data?.userPlan) {
      await clientStorage.set(ClientStorageKey.USER_PLAN, data.userPlan);
      account.update((current) => ({ ...current, plan: data.userPlan }));
      return {
        status: "resolved" as const,
        plan: data.userPlan as IUserPlan
      };
    }
    await clientStorage.remove(ClientStorageKey.USER_PLAN);
    account.update((current) => ({ ...current, plan: undefined }));
    return { status: "resolved" as const, plan: undefined };
  } catch (error) {
    logger.error({ at: "refreshPlanData", error });
    return { status: "unavailable" as const, error };
  }
}

async function logGuest(id: string) {
  try {
    return legacyAccountTransport.runAccountAction("guest", { id });
  } catch (error) {
    logger.error({ at: "logGuest", error });
  }
}

async function ensureOfflineSession() {
  const existingSessionId = await clientStorage.get(
    ClientStorageKey.OFFLINE_SESSION_ID
  );
  if (existingSessionId) return existingSessionId;
  const sessionId = generateSimpleRandomId();
  await clientStorage.set(ClientStorageKey.OFFLINE_SESSION_ID, sessionId);
  return sessionId;
}

async function startOfflineSession() {
  account.update((current) => ({
    ...current,
    token: undefined,
    userId: undefined,
    userInfo: undefined,
    dataMode: UserDataMode.LOCAL,
    sessionType: UserSessionType.RETURNING
  }));
  await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
  await clientStorage.remove(ClientStorageKey.STOKEN);
  await clientStorage.remove(ClientStorageKey.USER);
  await clientStorage.remove(ClientStorageKey.USER_INFO);
  await ensureOfflineSession();
}

async function bootstrapAuthFn(
  region: string
): Promise<boolean | "not-authfn"> {
  const result = await bootstrapNucleusAccount(region);
  if (result.kind === "not-authfn") return "not-authfn";
  if (result.kind === "failed") {
    logger.error({
      at: "account.bootstrapAuthFn.failed",
      status: result.status,
      error: result.error
    });
    return false;
  }

  await signInFromAuthFnSession({
    token: result.token,
    session: result.session,
    regionId: result.session.regionId ?? region,
    isNewUser: true,
    isPreventRedirect: true
  });
  gotoPostAuthRoute({ isNewUser: true });
  return true;
}

async function bootstrapRemote(region: string) {
  const id = account.get()?.userInfo?.id?.split("user:")[1];
  if (!id) return;
  const response = await legacyAccountTransport.runAccountAction("bootstrap", {
    id,
    region
  });
  if (!response || response.error || !response.userInfo) return false;
  void signIn(
    { userInfo: response.userInfo, token: response.token },
    { isNewUser: true }
  );
  return true;
}

async function bootstrap(region: string) {
  const authFnResult = await bootstrapAuthFn(region);
  if (authFnResult !== "not-authfn") return authFnResult;
  return bootstrapRemote(region);
}

async function checkIfSessionExpired() {
  const resolution = await resolveAuthSession();
  return !["authenticated", "offline-only", "cached-cloud"].includes(
    resolution.status
  );
}

/** Coordinates account persistence, authentication, and application lifecycle work. */
export const accountSession = {
  init,
  signIn,
  gotoPostAuthRoute,
  signOut,
  embedOAuthSignin,
  signInFromAuthFnSession,
  refreshPlanData,
  logGuest,
  startOfflineSession,
  bootstrap,
  checkIfSessionExpired
};
