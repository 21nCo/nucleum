<script lang="ts">
  import { page } from "$app/stores";
  import AppLoadingView from "$lib/tidy/layout/paint/AppLoadingView.svelte";
  import { account, windowObject } from "$lib/tidy/stores/app.store";
  import { handleOAuthRedirection } from "$lib/tidy/utils/oauth.utils";
  import { onMount } from "svelte";
  onMount(async () => {
    let codeQueryParam = $page.url.searchParams.get("code");
    if (!codeQueryParam) {
      windowObject.gotoPath("/signup?msg=invalidoauth");
      return;
    } else {
      await processOAuthRedirection(codeQueryParam);
    }
    const sub = account.subscribe((value) => {
      if (value.isLoggedIn) {
        windowObject.gotoPath("/");
      }
    });
    return () => {
      sub();
    };
  });
  async function processOAuthRedirection(code: string) {
    let response = await handleOAuthRedirection($page.params.slug, code);
    if (!response) return;
    const json = await response.json();
    console.log({ json });
    await account.signIn(json, { isFromSignup: json.isSignup });
  }
</script>

<AppLoadingView message="logging you in..." />
