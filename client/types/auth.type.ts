import type { AuthFnSession } from "@authfn/client";

/** Locally persisted markers used to decide how an AuthFn session can resume. */
export type StoredAuthSessionState = {
  shouldUseBearerSession: boolean;
  authFnToken?: string;
  offlineSessionId?: string;
  hasStoredUserInfo: boolean;
  hasStoredCloudIdentity: boolean;
  hasOfflineOnlySession: boolean;
  isDatafnOfflinabilityEnabled: boolean;
  isOffline: boolean;
};

/** Result of resolving the active AuthFn session and its offline fallbacks. */
export type AuthSessionResolution =
  | {
      status: "authenticated";
      storedState: StoredAuthSessionState;
      session: AuthFnSession;
    }
  | {
      status: "offline-only";
      storedState: StoredAuthSessionState;
    }
  | {
      status: "cached-cloud";
      storedState: StoredAuthSessionState;
      error?: unknown;
    }
  | {
      status: "expired";
      storedState: StoredAuthSessionState;
    }
  | {
      status: "signed-out";
      storedState: StoredAuthSessionState;
    }
  | {
      status: "unavailable";
      storedState: StoredAuthSessionState;
      error: unknown;
    };
