<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import AppLoadingView from "$lib/tidy/layout/paint/AppLoadingView.svelte";
  import { account, appStore, view } from "$lib/tidy/stores/app.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { OS } from "$lib/tidy/types/os.enum";
  import { detectSystemOS } from "$lib/tidy/utils/browser.utils";
  import { handleOAuthRedirection } from "$lib/tidy/utils/oauth.utils";
  import { onMount } from "svelte";
  onMount(async () => {
    let codeQueryParam = $page.url.searchParams.get("code");
    if (!codeQueryParam) {
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
    const os = detectSystemOS();
    if (os == OS.IOS) {
      if (json.isSignup) {
        goto($appStore.product + "://oauthsignup" + "?token=" + json.token);
      } else {
        goto($appStore.product + "://oauthsignin" + "?token=" + json.token);
      }
      setTimeout(() => {
        account.signIn(json, { isFromSignup: json.isSignup });
      }, 10000);
    } else {
      await account.signIn(json, { isFromSignup: json.isSignup });
    }
  }
</script>

<AppLoadingView message="logging you in..." />
