<script lang="ts">
  // import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import account from "$lib/client/stores/account.store";
  import { handleOAuthRedirection } from "$lib/client/components/oauth/oauth.utils";
  import { onMount } from "svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed, OperatingSystem } from "$lib/client/types/context.type";
  import { logger } from "../debug/logger.client";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { postTokenToExtension } from "$lib/client/utils/embed.utils";
  import { Action } from "$lib/client/types/action.enum";

  let debugMessage = "debug";
  $: {
    if (debugMessage) {
      console.log({ debugMessage });
    }
  }
  onMount(async () => {
    try {
      let codeQueryParam = $page.url.searchParams.get("code");
      let token = $page.url.searchParams.get("token");
      if (token) {
        debugMessage = "token present";
        handleOAuthCompletion({ token });
      } else if (!codeQueryParam) {
        appStore.gotoPath("/signup?msg=invalidoauth");
        return;
      } else {
        debugMessage = "code present. processing oauth";
        let response = await handleOAuthRedirection(
          $page.params.slug,
          codeQueryParam
        );
        if (!response) {
          appStore.gotoErrorPage("OAuth failure");
          return;
        }
        const json = await response.json();
        debugMessage = `isEmbed: ${$context.isEmbed} and os: ${$context.os}`;
        handleOAuthCompletion(json);
      }
    } catch (e) {
      console.error({ at: "OAuthRedirect.onMount", error: e });
      appStore.gotoErrorPage("OAuth failure");
    }
  });

  async function handleOAuthCompletion(data: {
    token: string;
    refreshToken?: string;
    userInfo?: any;
  }) {
    console.log({
      ctx: "handleOAuthCompletion",
      os: $context.os,
      isEmbed: $context.isEmbed,
      embed: $context.embed,
      userAgent: navigator.userAgent
    });
    const isExtensionLogin = await clientStorage.getForSession(
      ClientStorageKey.IS_EXTENSION_LOGIN
    );
    if (isExtensionLogin) {
      clientStorage.removeForSession(ClientStorageKey.IS_EXTENSION_LOGIN);
      postTokenToExtension(data);
      // appStore.runAction(Action.EXTENSTION_LOGIN);
      appStore.gotoPath("/ext/login");
    } else if (
      ($context.os == OperatingSystem.MACOS ||
        ($context.os == OperatingSystem.IOS &&
          $context.embed === Embed.TABLET)) &&
      $context.isEmbed
    ) {
      handleMacOSEmbedRedirection(data.token);
    } else if ($context.os == OperatingSystem.IOS) {
      handleiOSEmbedRedirection(data.token);
    } else if (data.userInfo) {
      debugMessage = "signing in with oauth";
      account.signIn({ ...data, userInfo: data.userInfo });
    } else if (data.token) {
      debugMessage = "signing in using embed token";
      await account.embedOAuthSignin(data.token);
    }
  }

  async function handleiOSEmbedRedirection(token: string) {
    try {
      debugMessage = "ios - embed redirection";
      console.log({
        ctx: "handleiOSEmbedRedirection",
        product: $appStore.product
      });
      appStore.gotoPath(
        $appStore.product + "://oauthsignin" + "?token=" + token
      );
    } catch (err) {
      debugMessage = "ios - embed redirection error" + err;
      console.error({ err, ctx: "handleiOSEmbedRedirection" });
      appStore.gotoErrorPage(debugMessage);
    }
  }
  async function handleMacOSEmbedRedirection(token: string) {
    try {
      debugMessage = "macos - embed redirection";
      logger.log({
        ctx: "handleMacOSEmbedRedirection"
      });
      appStore.gotoPath(
        (import.meta.env?.VITE_CUSTOM_PROTOCOL ?? "blanklabs") +
          "://localhost/index.html" +
          "?token=" +
          token
      );
    } catch (err) {
      debugMessage = "macos - embed redirection error" + err;
      logger.error({ err, ctx: "handleMacOSEmbedRedirection" });
      appStore.gotoErrorPage(debugMessage);
    }
  }
</script>

<AppLoadingView message="Signing you in" />
<!-- <AppLoadingView message={debugMessage} /> -->
