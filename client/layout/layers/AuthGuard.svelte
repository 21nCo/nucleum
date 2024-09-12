<script lang="ts">
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import account, { isRefreshingToken } from "$lib/client/stores/account.store";
  import {
    appStore,
    excludedPathsForRedirectionCheck
  } from "$lib/client/stores/app.store";
  import { wait } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  console.log({ at: "AuthGuard" });

  let isLoggedIn: boolean = false;

  onMount(async () => {
    isLoggedIn = await performLoginStatusCheck();
    console.log({ isLoggedIn });
  });

  /**
   * TODO - all {@link excludedPathsForRedirectionCheck} should be defined in routes as dynamic route [...route] is guarded by AuthGuard
   */
  async function performLoginStatusCheck() {
    const token = clientStorage.get(ClientStorageKey.STOKEN);
    const offlineSessionId = clientStorage.get(
      ClientStorageKey.OFFLINE_SESSION_ID
    );
    if (!token && !offlineSessionId) {
      console.log("Token not found. Redirecting to signup");
      appStore.gotoPath("/signup");
      return false;
    }
    let isSessionExpiredOrRefreshing = await account.checkIfSessionExpired();
    if (isSessionExpiredOrRefreshing && $isRefreshingToken) {
      while ($isRefreshingToken) {
        await wait(1000);
      }
    }
    isSessionExpiredOrRefreshing = await account.checkIfSessionExpired();
    if (isSessionExpiredOrRefreshing) {
      appStore.gotoPath("/signup?msg=expired");
      return false;
    } else return true;
  }
</script>

<slot {isLoggedIn} />
