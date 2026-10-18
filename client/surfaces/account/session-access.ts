import { navigation } from "@nucleum/shell/navigation/navigation";
import { get } from "svelte/store";

import { resolveStoredUserInformation } from "@nucleum/client/runtime/account/account-storage";
import account from "@nucleum/client/runtime/account/account.store";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { accountSession } from "@nucleum/surfaces/account/account-session";

import {
  UserDataMode,
  UserSessionType
} from "@nucleum/client/runtime/account/account.type";

import { PlanType } from "@nucleum/schema/account/subscription";

import { resolveAuthSession } from "@nucleum/client/runtime/account/auth";
import { logger } from "@nucleum/client/runtime/logging/logger";
/** Hydrates the resolved account session and enforces the supplied product plan requirement. */
export async function performLoginStatusCheck(requiredPlan?: PlanType) {
  const resolution = await resolveAuthSession();
  if (resolution.status === "offline-only") {
    return true;
  }

  if (resolution.status === "cached-cloud") {
    if (
      requiredPlan !== undefined &&
      get(account).plan &&
      get(account).plan.plan !== requiredPlan
    ) {
      navigation.gotoPath("/error/access-denied");
      return false;
    }
    return true;
  }

  if (resolution.status === "expired") {
    logger.warn({
      at: "AuthGuard.performLoginStatusCheck.session.expired",
      currentPath: window.location.pathname
    });
    clearAccountStore();
    navigation.gotoPath("/account/login", {
      queryParams: { msg: "expired" },
      replaceState: true
    });
    return false;
  }

  if (resolution.status === "unavailable") {
    logger.warn({
      at: "AuthGuard.performLoginStatusCheck.session.unavailable",
      error: resolution.error,
      currentPath: window.location.pathname
    });
    navigation.gotoPath("/account/login", {
      queryParams: { msg: "unavailable" },
      replaceState: true
    });
    return false;
  }

  if (resolution.status === "signed-out") {
    clearAccountStore();
    navigation.gotoPath("/account/login", { replaceState: true });
    return false;
  }

  const authSession = resolution.session;
  const subject = authSession.subject ?? {};
  const actorId = String(authSession.actorId ?? "");
  const normalizedActorId = actorId.startsWith("user:")
    ? actorId
    : `user:${actorId}`;
  const unprefixedActorId = normalizedActorId.slice("user:".length);
  const storedUserInfo = resolveStoredUserInformation(
    await clientStorage.get(ClientStorageKey.USER_INFO)
  );
  const currentUserInfo = account.get()?.userInfo ?? storedUserInfo;
  const cachedPlan =
    currentUserInfo?.id === normalizedActorId ? account.get()?.plan : undefined;
  const userInfo = {
    ...currentUserInfo,
    id: normalizedActorId,
    email: authSession.primaryEmail ?? subject.email ?? "",
    isBootstrapped:
      (
        authSession.metadata?.nucleus as
          | { isBootstrapped?: boolean }
          | undefined
      )?.isBootstrapped ?? false,
    nickName:
      currentUserInfo?.nickName ??
      authSession.primaryEmail?.split("@")[0] ??
      subject.email?.split("@")[0] ??
      "App user",
    joinDate: currentUserInfo?.joinDate ?? new Date(),
    lastLogin: new Date(),
    region: authSession.regionId ?? subject.regionId
  };
  await clientStorage.set(ClientStorageKey.USER, authSession);
  await clientStorage.set(ClientStorageKey.USER_INFO, userInfo);
  logger.info({
    at: "AuthGuard.performLoginStatusCheck.session.ok",
    hasAuthFnToken: Boolean(resolution.storedState.authFnToken),
    hasOfflineSession: Boolean(resolution.storedState.offlineSessionId),
    sessionId: authSession.id,
    regionId: authSession.regionId ?? subject.regionId,
    currentPath: window.location.pathname
  });
  account.update((current) => ({
    ...current,
    token: resolution.storedState.authFnToken,
    dataMode: UserDataMode.CLOUD,
    sessionType: UserSessionType.RETURNING,
    userId: unprefixedActorId,
    userInfo: userInfo as any,
    plan: requiredPlan !== undefined ? cachedPlan : current.plan
  }));
  if (requiredPlan !== undefined) {
    const planResolution = await accountSession.refreshPlanData();
    const plan =
      planResolution.status === "resolved" ? planResolution.plan : cachedPlan;
    if (plan?.plan !== requiredPlan) {
      navigation.gotoPath("/error/access-denied");
      return false;
    }
  }
  return true;
}

function clearAccountStore() {
  account.update(() => ({
    dataMode: UserDataMode.NONE,
    sessionType: UserSessionType.UNDETERMINED
  }));
}
