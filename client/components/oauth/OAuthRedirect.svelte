<script lang="ts">
  // import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import account from "$lib/client/stores/account.store";
  import { handleOAuthRedirection } from "$lib/client/components/oauth/oauth.utils";
  import { onMount } from "svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { logger } from "../debug/logger.client";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  let debugMessage = "debug";
  $: {
    if (debugMessage) {
      console.log({ debugMessage });
    }
  }
  onMount(async () => {
    try {
      let codeQueryParam = $page.url.searchParams.get(AppSearchParam.CODE);
      let token = $page.url.searchParams.get(AppSearchParam.TOKEN);
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
    const isEmbedRedirection = await clientStorage.getForSession(
      ClientStorageKey.EMBED_OAUTH
    );
    console.log({
      ctx: "handleOAuthCompletion",
      os: $context.os,
      isEmbed: $context.isEmbed,
      embed: $context.embed,
      userAgent: navigator.userAgent,
      isEmbedRedirection
    });
    if ($context.os == OperatingSystem.MACOS && $context.isEmbed) {
      handleMacOSEmbedRedirection(data.token);
    } else if (
      $context.os == OperatingSystem.IOS ||
      (isEmbedRedirection &&
        ($context.os === OperatingSystem.MACOS ||
          $context.os === OperatingSystem.WINDOWS))
    ) {
      handleUrlSchemeRedirection(data.token);
    } else if (data.userInfo) {
      debugMessage = "signing in with oauth";
      account.signIn({ ...data, userInfo: data.userInfo });
    } else if (data.token) {
      debugMessage = "signing in using embed token";
      await account.embedOAuthSignin(data.token);
    }
  }

  async function handleUrlSchemeRedirection(token: string) {
    try {
      debugMessage = "ios - url scheme redirection";
      console.log({
        ctx: "handleUrlSchemeRedirection",
        product: $appStore.product
      });
      appStore.gotoPath(
        $appStore.product + "://oauthsignin" + "?token=" + token
      );
    } catch (err) {
      debugMessage = "ios - url scheme redirection error" + err;
      console.error({ err, ctx: "handleUrlSchemeRedirection" });
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
        (import.meta.env?.VITE_CUSTOM_PROTOCOL ?? "tauri") +
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
