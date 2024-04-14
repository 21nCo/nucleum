<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import AppLoadingView from "$lib/tidy/layout/paint/AppLoadingView.svelte";
  import account from "$lib/tidy/stores/account.store";
  import view from "$lib/tidy/stores/view.store";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { OS } from "$lib/tidy/types/os.enum";
  import { detectSystemOS } from "$lib/tidy/utils/browser.utils";
  import { handleOAuthRedirection } from "$lib/tidy/utils/oauth.utils";
  import { onMount } from "svelte";
  $: os = detectSystemOS();
  onMount(async () => {
    let codeQueryParam = $page.url.searchParams.get("code");
    let token = $page.url.searchParams.get("token");
    if (token) {
      const isSignup = $page.url?.searchParams?.get("signup");
      if (os == OS.IOS) {
        handleEmbedRedirection(token, isSignup === "true" ?? false);
      } else
        await account.embedOAuthSignin(token, isSignup === "true" ?? false);
    } else if (!codeQueryParam) {
      view.gotoPath("/signup?msg=invalidoauth");
      return;
    } else {
      await processOAuthRedirection(codeQueryParam);
    }
  });
  async function processOAuthRedirection(code: string) {
    let response = await handleOAuthRedirection($page.params.slug, code);
    if (!response) return;
    const json = await response.json();
    if (os == OS.IOS) {
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

<AppLoadingView message="Signing in" />
