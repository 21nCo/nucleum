<svelte:options runes={true} />

<script lang="ts">
  import { performLoginStatusCheck } from "@nucleum/surfaces/account/session-access";
  import { completeExtensionLogin } from "@nucleum/surfaces/account/extension-login";
  import { resolveProductConfig } from "@nucleum/products/product.config";
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { replaceState } from "$app/navigation";

  import account from "@nucleum/client/runtime/account/account.store";

  import { accountSession } from "@nucleum/surfaces/account/account-session";

  import context from "@nucleum/client/runtime/context.store";
  import {
    UserDataMode,
    UserSessionType
  } from "@nucleum/client/runtime/account/account.type";

  import { onMount } from "svelte";

  let { children }: { children?: Snippet<[boolean]> } = $props();
  let isLoggedIn = $state(false);

  onMount(async () => {
    if (!$context.isSheet && $context.isEmbed) {
      await parseEmbedToken();
    }
    const result = await performLoginStatusCheck(
      resolveProductConfig().requiredPlan
    );
    if (
      result &&
      $account.dataMode === UserDataMode.CLOUD &&
      !$account.userInfo?.isBootstrapped
    ) {
      account.update((current) => ({
        ...current,
        sessionType: UserSessionType.NEW
      }));
      navigation.gotoPath("/bootstrap");
      return;
    }
    if (result && (await completeExtensionLogin())) return;
    isLoggedIn = result;
    console.log({ isLoggedIn });
  });

  async function parseEmbedToken() {
    const url = $page.url;
    const token = url?.searchParams?.get("token");
    if (!token) return;
    const cleanUrl = new URL(url);
    cleanUrl.searchParams.delete("token");
    replaceState(cleanUrl, $page.state);
    await accountSession.embedOAuthSignin(token);
  }
</script>

{@render children?.(isLoggedIn)}
