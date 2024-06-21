<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import account from "$lib/client/stores/account.store";
  import { OS } from "$lib/client/types/os.enum";
  import { detectSystemOS } from "$lib/client/utils/browser.utils";
  import { handleOAuthRedirection } from "$lib/client/utils/oauth.utils";
  import { onMount } from "svelte";
  import context from "$lib/client/stores/context.store";
  $: os = detectSystemOS();
  let debugMessage = "debug";
  onMount(async () => {
    let codeQueryParam = $page.url.searchParams.get("code");
    let token = $page.url.searchParams.get("token");
    if (token) {
      debugMessage = "token present";
      const isSignup = $page.url?.searchParams?.get("signup");
      if (os == OS.IOS) {
        handleEmbedRedirection(token, isSignup === "true" ?? false);
      } else
        await account.embedOAuthSignin(token, isSignup === "true" ?? false);
    } else if (!codeQueryParam) {
      appStore.gotoPath("/signup?msg=invalidoauth");
      return;
    } else {
      await processOAuthRedirection(codeQueryParam);
    }
  });
  async function processOAuthRedirection(code: string) {
    debugMessage = "code present. processing oauth";
    let response = await handleOAuthRedirection($page.params.slug, code);
    if (!response) return;
    const json = await response.json();
    debugMessage = `isEmbed: ${$context.isEmbed} and os: ${os}`;
    if (os == OS.IOS) {
      debugMessage = "ios - embed redirection";
      handleEmbedRedirection(json.token, json.isSignup);
    } else {
      await account.signIn(json, { isFromSignup: json.isSignup });
    }
  }
  async function handleEmbedRedirection(token: string, isSignup: boolean) {
    if (isSignup) {
      goto($appStore.product + "://oauthsignup" + "?token=" + token);
    } else {
      goto($appStore.product + "://oauthsignin" + "?token=" + token);
    }
  }
</script>

<AppLoadingView message="Signing you in" />
<!-- <AppLoadingView message={debugMessage} /> -->
