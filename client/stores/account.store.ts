import { get, writable } from "svelte/store";
import {
  PlanStatus,
  UserDataMode,
  UserSessionType,
  type IUserPlan,
  type UserAccount,
  type UserInformation
} from "@21n/types/account.type";
import { postDataToParent } from "@21n/utils/embed.utils";
import { Persistence } from "@21n/persistence/persistence";
import {
  determineIfOffline,
  performApiCall
} from "@21n/utils/network.utils";
import {
  confirmationNotification,
  toasts
} from "@21n/stores/notification.store";
import { ButtonVariant } from "@21n/types/button.type";
import { appStore } from "@21n/stores/app.store";
import {
  getBucketNameandKey,
  hasLegacyCloudSession,
  signout
} from "@21n/utils/account.utils";
import {
  determineIfPlanIsActive,
  determineIfSubscriptionExpired
} from "@21n/components/subscription/userPlan.utils";
import { ObservableStore } from "@21n/stores/client.store";
import { StoreDataType } from "@21n/types/data.type";
import { clientStorage } from "@21n/persistence/persistence.utils";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { logger } from "@21n/components/debug/logger.client";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { fileStore } from "@21n/components/files/file.store";
import { flux } from "@21n/components/flux/flux";
import { generateResourceId } from "@21n/components/flux/flux.utils";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { dispatchCustomEvent } from "@21n/utils/browser.utils";
import { GlobalEvent } from "@21n/types/event.enum";
import context from "@21n/stores/context.store";
import { compressImageToTargetSize } from "@21n/utils/ui.utils";
import { convertHeicToPng } from "@21n/utils/ui.utils";
import { generateImagePreviewFromPdf } from "@21n/utils/pdf.utils";
import { Action } from "@21n/types/action.enum";
import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
import { parse } from "@21n/shared-utils/json.utils";
import { resolveAccountBaseUrl } from "@21n/components/network";

export const isRefreshingToken = writable(false);

class AccountStore extends ObservableStore<UserAccount> {
  persistence = new Persistence();
  constructor() {
    super("account", StoreDataType.NA);
  }

  async init() {
    let seed: UserAccount = {
      dataMode: UserDataMode.NONE,
      sessionType: UserSessionType.UNDETERMINED
    };
    const authFnToken = await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
    const offlineSessionId = await clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    const hasLegacySession = await hasLegacyCloudSession();
    if (authFnToken) {
      seed.token = authFnToken;
      if (!offlineSessionId && !hasLegacySession) {
        await this.ensureOfflineSession();
      }
      seed.dataMode = hasLegacySession ? UserDataMode.CLOUD : UserDataMode.LOCAL;
      seed.sessionType = UserSessionType.RETURNING;
    } else if (offlineSessionId) {
      seed.dataMode = UserDataMode.LOCAL;
      seed.sessionType = UserSessionType.RETURNING;
    }
    const userInfo = await clientStorage.get(ClientStorageKey.USER_INFO);
    if (userInfo) {
      seed.userInfo = parse(userInfo ?? "");
      seed.userId = seed.userInfo?.id.split("user:")[1];
    }
    this.set(seed);
    this.postToEmbed(seed);
  }

  async postToEmbed(data: any = null) {
    if (!data) {
      const token = await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
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

  async signIn(
    data: {
      userInfo: UserInformation;
      token: string;
    },
    params: {
      isNewUser?: boolean;
    } = { isNewUser: false }
  ) {
    await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, data.token);
    await clientStorage.remove(ClientStorageKey.STOKEN);
    await clientStorage.set(ClientStorageKey.USER_INFO, data.userInfo);
    await this.ensureOfflineSession();
    const hasLegacySession = await hasLegacyCloudSession();
    this.postToEmbed(data);
    const isBootstrapped = data.userInfo.isBootstrapped;
    this.update(() => {
      return {
        token: data.token,
        dataMode: hasLegacySession ? UserDataMode.CLOUD : UserDataMode.LOCAL,
        userId: data.userInfo.id.split("user:")[1],
        userInfo: data.userInfo,
        sessionType:
          isBootstrapped && !params.isNewUser
            ? UserSessionType.RETURNING
            : UserSessionType.NEW
      };
    });
    this.gotoPostAuthRoute({ isNewUser: params.isNewUser, userInfo: data.userInfo });
  }

  gotoPostAuthRoute(params?: {
    isNewUser?: boolean;
    userInfo?: Pick<UserInformation, "isBootstrapped">;
  }) {
    const userInfo = params?.userInfo ?? this.get()?.userInfo;
    const isBootstrapped = userInfo?.isBootstrapped ?? true;
    if (params?.isNewUser && isBootstrapped) {
      appStore.gotoPath("/onboarding");
    } else if (!isBootstrapped) {
      appStore.gotoPath("/bootstrap");
    } else {
      appStore.gotoPath("/");
    }
  }

  async signOut(params?: {
    isPreventDapIdClear?: boolean;
    isPreventRedirect?: boolean;
  }) {
    this.update(() => {
      const n = {
        sessionType: UserSessionType.UNDETERMINED,
        dataMode: UserDataMode.NONE
      };
      return n;
    });
    // TODO - this is causing issue in macOS app - signout is not working
    // await flux?.terminate();
    await signout(params, "signOut account.store");
  }
  async embedOAuthSignin(token: string) {
    await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, token);
    await clientStorage.remove(ClientStorageKey.STOKEN);
    await this.ensureOfflineSession();
    const response = await this.resolveAuthFnSessionUserInfo();
    if (response?.userInfo) {
      this.signIn({
        userInfo: response?.userInfo,
        token
      });
    } else {
      console.log("error", response);
    }
  }

  async signInFromAuthFnSession(params?: {
    token?: string;
    session?: any;
    regionId?: string;
    isNewUser?: boolean;
    isPreventRedirect?: boolean;
  }) {
    const previousAuthFnToken = await clientStorage.get(
      ClientStorageKey.AUTHFN_TOKEN
    );
    const hasTokenFromResponse = Boolean(params?.token?.trim());
    if (hasTokenFromResponse && params?.token) {
      await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, params.token);
    }
    if (params?.regionId) {
      await clientStorage.set(ClientStorageKey.REGION, params.regionId);
    }

    let authSession = params?.session;
    if (!authSession) {
      const { authClient } = await import("@21n/components/account/auth");
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
      if (hasTokenFromResponse) {
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

    const sessionToken = params?.token ?? previousAuthFnToken ?? undefined;
    if (sessionToken) {
      await clientStorage.set(ClientStorageKey.AUTHFN_TOKEN, sessionToken);
    } else {
      await clientStorage.remove(ClientStorageKey.AUTHFN_TOKEN);
    }
    await clientStorage.remove(ClientStorageKey.STOKEN);
    await clientStorage.set(ClientStorageKey.USER, authSession);
    await this.ensureOfflineSession();

    const userInfo = this.resolveUserInfoFromAuthFnSession(authSession);
    await clientStorage.set(ClientStorageKey.USER_INFO, userInfo);
    const legacyCloudSession = await hasLegacyCloudSession();
    this.postToEmbed({ token: sessionToken, userInfo });
    this.update(() => ({
      token: sessionToken,
      dataMode: legacyCloudSession ? UserDataMode.CLOUD : UserDataMode.LOCAL,
      sessionType:
        userInfo.isBootstrapped && !params?.isNewUser
          ? UserSessionType.RETURNING
          : UserSessionType.NEW,
      userId: userInfo.id.split("user:")[1],
      userInfo
    }));

    if (params?.isPreventRedirect) return true;
    this.gotoPostAuthRoute({ isNewUser: params?.isNewUser, userInfo });
    return true;
  }

  private async resolveAuthFnSessionUserInfo(): Promise<{
    userInfo: UserInformation;
  } | null> {
    const { authClient } = await import("@21n/components/account/auth");
    const response = await (await authClient()).getSession();
    if (!response.ok || !response.data.session) {
      return null;
    }
    const session = response.data.session;
    return { userInfo: this.resolveUserInfoFromAuthFnSession(session) };
  }

  private resolveUserInfoFromAuthFnSession(session: any): UserInformation {
    const metadata = (session.metadata ?? {}) as {
      nucleus?: {
        isBootstrapped?: boolean;
        nickName?: string;
        profilePictureUrl?: string;
      };
    };
    const email = session.primaryEmail ?? session.subject.email ?? "";
    const id = session.actorId.startsWith("user:")
      ? session.actorId
      : `user:${session.actorId}`;
    return {
      id,
      email,
      nickName: metadata.nucleus?.nickName ?? email.split("@")[0] ?? "",
      joinDate: new Date(),
      lastLogin: new Date(),
      profilePictureUrl: metadata.nucleus?.profilePictureUrl,
      isBootstrapped: metadata.nucleus?.isBootstrapped ?? true,
      region: session.regionId ?? session.subject.regionId
    };
  }

  async delete() {
    confirmationNotification.notify({
      title: "Account deletion confirmation",
      message: "Are you sure you want to delete your account?",
      confirmAction: {
        label: "Delete",
        variant: ButtonVariant.DANGER,
        callback: async () => {
          return this.confirmDelete();
        }
      }
    });
  }

  async confirmDelete() {
    let isDeleted = false;
    try {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: `Deleting account...`
      });
      const authFnDeleteStatus = await this.tryConfirmAuthFnDelete();
      if (authFnDeleteStatus === "failed") {
        return false;
      }
      if (authFnDeleteStatus === "deleted") {
        await this.signOut({ isPreventRedirect: true });
        await flux.clear();
        appStore.gotoPath("/signup?msg=deleted");
        isDeleted = true;
        return true;
      }

      const result = await performApiCall(
        "v2/account/deleteAccount",
        "POST",
        {}
      );
      if (!result?.ok) {
        toasts.error("Failed to delete account. Please try again later.");
        return false;
      }
      const data = await result.json();
      if (data?.error) {
        toasts.error(data.error);
        return false;
      }
      await this.signOut({ isPreventRedirect: true });
      await flux.clear();
      appStore.gotoPath("/signup?msg=deleted");
      isDeleted = true;
      return true;
    } catch (e) {
      logger.error({ at: "confirmDelete", error: e });
      toasts.error("Failed to delete account. Please try again later.");
      return false;
    } finally {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: isDeleted ? `Account deleted.` : "Account deletion failed.",
        subMessage: "",
        isFinished: true
      });
    }
  }

  private async tryConfirmAuthFnDelete(): Promise<
    "deleted" | "not-authfn" | "failed"
  > {
    try {
      const { authClient } = await import("@21n/components/account/auth");
      const response = await (await authClient({
        isPreventCachedInstance: true
      })).deleteAccount();
      if (response.ok) {
        return "deleted";
      }
      if (
        response.error.code === "AUTHFN_UNAUTHENTICATED" &&
        (await hasLegacyCloudSession())
      ) {
        return "not-authfn";
      }
      toasts.error(
        response.error.message ??
          "Failed to delete account. Please try again later."
      );
      return "failed";
    } catch (error) {
      logger.error({ at: "tryConfirmAuthFnDelete", error });
      if (await hasLegacyCloudSession()) {
        return "not-authfn";
      }
      toasts.error("Failed to delete account. Please try again later.");
      return "failed";
    }
  }

  async ping(params?: { isLightMode?: boolean }) {
    this.postToEmbed();
    const isOffline = await determineIfOffline();
    if (isOffline) return;
    const authFnToken = await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
    let response = await this.persistence.ping();
    let user = Array.isArray(response) ? response?.[0]?.result?.[0] : undefined;
    if (!response) {
      if (authFnToken) {
        logger.log({
          at: "account.ping",
          message:
            "Legacy account ping failed; keeping AuthFn session active."
        });
        return;
      }
      const reTryResponse = await this.persistence.ping();
      if (!reTryResponse) {
        appStore.gotoErrorPage("Something went wrong.");
      }
      response = reTryResponse;
      user = Array.isArray(response) ? response?.[0]?.result?.[0] : undefined;
    }
    if (response && !user) {
      if (authFnToken) {
        logger.log({
          at: "account.ping",
          message:
            "Legacy account ping did not return a user; keeping AuthFn session active."
        });
        return response;
      }
      await this.signOut({ isPreventRedirect: true });
      await flux.clear();
      appStore.gotoPath("/signup?msg=notfound");
    }
    if (user?.userPlan) {
      this.update((n) => {
        n.plan = user.userPlan;
        return n;
      });
      if (!params?.isLightMode) {
        await this.handlePlanStatus(user.userPlan);
      }
    }
    return response;
  }

  async handlePlanStatus(plan: IUserPlan) {
    const isActive = determineIfPlanIsActive(plan);
    if (!isActive) {
      appStore.runAction(Action.INACTIVE_PLAN);
    }
    let expiry = determineIfSubscriptionExpired(plan);
    if (!expiry.isExpired) return;
    await this.modifySubscription({
      type: "sync"
    });
    plan = this.get()?.plan ?? plan;
    expiry = determineIfSubscriptionExpired(plan);
    if (!expiry.isExpired) return;
    if (!expiry.isWithinBuffer) {
      appStore.runAction(Action.INACTIVE_PLAN);
      // appStore.runAction(Action.EXPIRED_PLAN);
    }
  }

  async refreshPlanData() {
    try {
      const isOffline = await determineIfOffline();
      if (isOffline) return;
      const response = await this.persistence.getUserPlan();
      const data = Array.isArray(response)
        ? response[0]?.result?.[0]
        : undefined;
      if (data?.userPlan) {
        this.update((n) => {
          n.plan = data.userPlan;
          return n;
        });
      }
    } catch (e) {
      logger.error({ at: "refreshPlanData", error: e });
    }
  }

  async initiateSubscription(params: any) {
    try {
      const isOffline = await determineIfOffline();
      if (isOffline) return;
      const response = await this.persistence.initiateSubscription(params);
      console.log({ at: "initiateSubscription", response });
      return response;
    } catch (e) {
      logger.error({ at: "initiateSubscription", error: e });
    }
  }

  async modifySubscription(params: any) {
    try {
      const isOffline = await determineIfOffline();
      if (isOffline) return;
      const response = await this.persistence.modifySubscription(params);
      if (response && response.userPlan) {
        this.update((n) => {
          n.plan = response.userPlan;
          return n;
        });
      }
      return response;
    } catch (e) {
      logger.error({ at: "modifySubscription", error: e });
    }
  }

  async restorePurchase() {
    try {
      const isOffline = await determineIfOffline();
      if (isOffline) return;
      const response = await this.persistence.restorePurchase();
      if (response && response.userPlan) {
        this.update((n) => {
          n.plan = response.userPlan;
          return n;
        });
      }
      return response;
    } catch (e) {
      logger.error({ at: "restorePurchase", error: e });
    }
  }
  async verifyPayment(nonce: string, embedTransaction?: any) {
    const response = await this.persistence.verifyPayment(
      nonce,
      embedTransaction
    );
    if (response && response.id) {
      const plan = response.userPlan ?? response;
      this.update((n) => {
        n.plan = plan;
        return n;
      });
      return { status: "success" };
    }
    return response;
  }

  async logGuest(id: string) {
    try {
      return this.persistence.runAccountAction("guest", { id });
    } catch (e) {
      logger.error({ at: "logGuest", error: e });
    }
  }

  async startOfflineSession() {
    this.update((n) => {
      n.dataMode = UserDataMode.LOCAL;
      return n;
    });
    await this.ensureOfflineSession();
  }

  async ensureOfflineSession() {
    const existingSessionId = await clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (existingSessionId) return existingSessionId;
    const sessionId = generateSimpleRandomId();
    await clientStorage.set(ClientStorageKey.OFFLINE_SESSION_ID, sessionId);
    return sessionId;
  }

  async bootstrap(region: string) {
    return this.bootstrapRemote(region);
  }

  async bootstrapRemote(region: string) {
    const id = this.get()?.userInfo?.id?.split("user:")[1];
    if (!id) return;
    const response = await this.persistence.runAccountAction("bootstrap", {
      id,
      region
    });
    if (!response || response.error || !response.userInfo) {
      return false;
    }
    this.signIn(
      {
        userInfo: response.userInfo,
        token: response.token
      },
      {
        isNewUser: true
      }
    );
    return true;
  }

  getSignedUrl(contentType: string, fileName: string, isTemp: boolean) {
    const acc = get(account);
    const userId = acc.userInfo?.id.split(":")[1] ?? "";
    return this.persistence.getSignedUrl(userId, contentType, fileName, isTemp);
  }

  /**
   * @deprecated - use uploadFileV2 instead
   * @param contentType
   * @param fileName
   * @param blob
   * @param isTemp
   * @returns
   */
  async uploadFile(
    contentType: string,
    fileName: string,
    blob: any,
    isTemp: boolean = false
  ) {
    const signedUrlResponse = await this.getSignedUrl(
      contentType,
      fileName,
      isTemp
    );
    if (signedUrlResponse?.uploadURL) {
      await this.persistence.uploadFile(
        signedUrlResponse.uploadURL,
        contentType,
        blob
      );
      return signedUrlResponse;
    } else return null;
  }

  async uploadFileV2(
    contentType: string,
    fileName: string,
    blob: Blob,
    params: {
      isTemp?: boolean;
      isReturnUrl?: boolean;
      isExtensionEnv?: boolean;
      isPreventSync?: boolean;
      isMeta?: boolean;
      thumbnailBlob?: Blob;
      isGenerateThumbnail?: boolean;
    } = {}
  ) {
    try {
      const account = this.get();
      const id = generateResourceId(Resource.file, {
        id: contentType.split("/")[0] + "_" + generateSimpleRandomId()
      });
      logger.log({ at: "uploadFileV2", id, contentType, fileName });
      fileName = fileName
        .replace(/\s+/g, "_")
        .replace(/[()@#$%&*!?<>{}[\]\\\/\^~`+=;:,'"|]/g, "_");

      // Convert HEIC files to PNG
      const isHeicFile = fileName.toLowerCase().endsWith(".heic");
      if (isHeicFile) {
        try {
          const { convertedBlob, convertedFileName } =
            await convertHeicToPng(blob);
          blob = convertedBlob;
          contentType = "image/png";
          fileName = fileName.replace(/\.heic$/i, ".png");
          logger.log({
            at: "uploadFileV2",
            message: "Converted HEIC to PNG",
            originalFileName: fileName,
            newContentType: contentType
          });
        } catch (error) {
          logger.error({
            at: "uploadFileV2",
            error,
            message: "HEIC conversion failed"
          });
          throw new Error(
            "Failed to convert HEIC file. Please try a different format."
          );
        }
      }

      let thumbnailBlob: Blob | undefined = params.thumbnailBlob;
      if (params.isGenerateThumbnail && !thumbnailBlob) {
        if (contentType.includes("image")) {
          thumbnailBlob = await compressImageToTargetSize(blob);
        } else if (contentType.includes("pdf")) {
          const result = await generateImagePreviewFromPdf(blob);
          if (result) thumbnailBlob = result as Blob;
        }
      }
      if (account.dataMode === UserDataMode.LOCAL || params.isPreventSync) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let thumbnailUint8Array: Uint8Array | undefined;
        if (thumbnailBlob) {
          const thumbnailArrayBuffer = await thumbnailBlob?.arrayBuffer();
          thumbnailUint8Array = new Uint8Array(thumbnailArrayBuffer);
        }
        const response = await fileStore.create([
          {
            id,
            label: fileName,
            type: contentType,
            data: uint8Array,
            size: uint8Array.length,
            isMeta: params.isMeta,
            thumbnailData: thumbnailUint8Array
          }
        ]);
        return response;
      } else {
        const signedUrlResponse = await this.getSignedUrl(
          contentType,
          fileName,
          params.isTemp ?? false
        );
        if (!signedUrlResponse || !signedUrlResponse.uploadURL) return null;

        await this.persistence.uploadFile(
          signedUrlResponse.uploadURL,
          contentType,
          blob
        );
        // const url = signedUrlResponse.uploadURL.split("?")[0];
        const key = getBucketNameandKey(signedUrlResponse.uploadURL);
        const signedGetUrl = await this.persistence.fetchSignedUrlForGet(key);
        const url = signedGetUrl?.getUrl;
        let thumbnailUrl: string | undefined;
        if (thumbnailBlob) {
          const signedThumbnailUrlResponse = await this.getSignedUrl(
            "image/jpeg",
            "thumbnail_" + fileName,
            params.isTemp ?? false
          );
          const thumbnailUploadUrl = signedThumbnailUrlResponse?.uploadURL;
          if (thumbnailUploadUrl) {
            await this.persistence.uploadFile(
              thumbnailUploadUrl,
              "image/jpeg",
              thumbnailBlob
            );
            const thumbnailKey = getBucketNameandKey(thumbnailUploadUrl);
            const signedThumbnailGetUrl =
              await this.persistence.fetchSignedUrlForGet(thumbnailKey);
            thumbnailUrl = signedThumbnailGetUrl?.getUrl;
          }
        }
        const file = {
          id,
          label: fileName,
          type: contentType,
          url,
          size: blob.size,
          isMeta: params.isMeta,
          thumbnailUrl
        };
        if (params.isReturnUrl) {
          return url;
        } else if (params.isExtensionEnv) {
          return file;
        }
        const response = await fileStore.create([file]);
        return response;
      }
    } catch (e) {
      logger.error({ at: "uploadFileV2", error: e });
    }
  }

  /**
   * Used to upload a file to s3 temp bucket
   * @param input the file that needs to be uploaded to the S3 temp bucket
   */
  async tempUploadToS3(input: any) {
    let itemLocalURL = new Blob([input], { type: input.type });
    let customName = input.name.split(".")[0].replace(/\s+/g, "");
    const result = await this.uploadFile(
      input.type,
      customName,
      itemLocalURL,
      true
    );
    let url = result.uploadURL.split("?")[0];
    return [url, customName, itemLocalURL];
  }

  async checkIfSessionExpired() {
    const authFnToken = await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
    const offlineSessionId = await clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (offlineSessionId && !authFnToken) {
      return false;
    }

    try {
      const { authClient } = await import("@21n/components/account/auth");
      const session = await (await authClient()).getSession();
      if (session.ok && session.data.session) {
        await clientStorage.set(ClientStorageKey.USER, session.data.session);
        return false;
      }
      return true;
    } catch (error) {
      logger.error({ at: "checkIfSessionExpired.authfn", error });
      return true;
    }
  }

  isCloudUserAndOffline() {
    const account = this.get();
    const ctx = get(context);
    if (account.dataMode === UserDataMode.CLOUD && ctx.isInOfflineMode)
      return true;
    return false;
  }

  isCloudUserAndOnline() {
    const account = this.get();
    const ctx = get(context);
    if (account.dataMode === UserDataMode.CLOUD && !ctx.isInOfflineMode)
      return true;
    return false;
  }
}

const account = new AccountStore();
export default account;
