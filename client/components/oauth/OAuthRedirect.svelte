<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import account from "$lib/client/stores/account.store";
  import { handleOAuthRedirection } from "$lib/client/components/oauth/oauth.utils";
  import { onMount } from "svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { logger } from "$lib/client/stores/log.store";

  let debugMessage = "debug";
  onMount(async () => {
    let codeQueryParam = $page.url.searchParams.get("code");
    let token = $page.url.searchParams.get("token");
    if (token) {
      logger.log("token present");
      const isSignup =
        $page.url?.searchParams?.get("signup") === "true" ?? "false";
      handleOAuthCompletion({ token, isSignup });
    } else if (!codeQueryParam) {
      appStore.gotoPath("/signup?msg=invalidoauth");
      return;
    } else {
      logger.log("code present. processing oauth");
      let response = await handleOAuthRedirection(
        $page.params.slug,
        codeQueryParam
      );
      if (!response) return;
      const json = await response.json();
      debugMessage = `isEmbed: ${$context.isEmbed} and os: ${$context.os}`;
      handleOAuthCompletion(json);
    }
  });

  async function handleOAuthCompletion(data: {
    token: string;
    isSignup: boolean;
    refreshToken?: string;
    userInfo?: any;
  }) {
    if ($context.os == OperatingSystem.IOS) {
      handleiOSEmbedRedirection(data.token, data.isSignup);
    } else if ($context.os == OperatingSystem.MACOS && $context.isEmbed) {
      handleMacOSEmbedRedirection(data.token, data.isSignup);
    } else if (data.userInfo) {
      logger.log("signing in with oauth");
      await account.signIn(
        { ...data, userInfo: data.userInfo },
        { isFromSignup: data.isSignup }
      );
    } else if (data.token) {
      logger.log("signing in using embed token");
      await account.embedOAuthSignin(data.token, data.isSignup);
    }
  }

  async function handleiOSEmbedRedirection(token: string, isSignup: boolean) {
    try {
      logger.log("ios - embed redirection");
      if (isSignup) {
        goto($appStore.product + "://oauthsignup" + "?token=" + token);
      } else {
        goto($appStore.product + "://oauthsignin" + "?token=" + token);
      }
    } catch (err) {
      goto("error");
    }
  }
  function handleMacOSEmbedRedirection(token: string, isSignup: boolean) {
    try {
      logger.log("macos - embed redirection");
      goto(
        (import.meta.env.VITE_CUSTOM_PROTOCOL ?? "blanklabs") +
          "://localhost/index.html" +
          "?token=" +
          token +
          "&signup=" +
          isSignup +
          "&debug=true"
      );
    } catch (err) {
      logger.log("macos - embed redirection error: " + err);
      goto("error");
    }
  }
</script>

<AppLoadingView message="Signing you in" />
<!-- <AppLoadingView message={debugMessage} /> -->
