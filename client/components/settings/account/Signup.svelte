<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import AccountForm from "./signup/AccountForm.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import Link from "$lib/client/elements/text/Link.svelte";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import account from "$lib/client/stores/account.store";
  import view from "$lib/client/stores/view.store";
  import { postTokenToExtension } from "$lib/client/utils/embed.utils";
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { Action } from "$lib/client/types/action.enum";
  let isSignup = true;
  let message: string | undefined = undefined;
  let messageParam = $page.url.searchParams.get("msg");
  if (messageParam) {
    if (messageParam === "deleted") {
      message = "Your account has been deleted.";
    } else if (messageParam === "signedout") {
      message = "You have been signed out.";
    } else if (messageParam === "expired") {
      message = "Your session has expired. Please login again.";
    }
  }
  onMount(() => {
    if (!$account.isLoggedIn) return;
    const isLoginFromExtensionParam = $page.url.searchParams.get("ext");
    if (isLoginFromExtensionParam && isLoginFromExtensionParam === "true") {
      const token = localStorage.getItem("stoken");
      const userInfo = localStorage.getItem("userInfo");
      postTokenToExtension({ token, userInfo });
      appStore.runAction("ext-login");
    } else appStore.gotoPath("/");
  });
</script>

<div class="flex flex-col w-full h-full justify-center pt-8 dp:pt-12">
  <div
    class="w-full flex flex-col justify-start items-center {$view.scale > 0.6
      ? 'gap-16'
      : 'gap-12'}"
  >
    <!-- <div class="flex flex-col items-center">
      <SubAtomLogo subatom="pointron" isDark={true} />
      <div class="font-medium text-h3 text-fgs2">
        {$appStore.appData.name}
      </div>
    </div> -->

    <div class="flex flex-col gap-6">
      <!-- TODO - reenable email signin/signup upon completion of forgot password flow -->
      {#if $appStore.isDebugMode}
        <PanelSwitcher
          items={["Sign up", "Sign in"]}
          value="Sign up"
          style={PanelSwitcherStyle.BAR}
          on:switch={(e) => {
            if (e.detail === "Sign up") {
              isSignup = true;
            } else {
              isSignup = false;
            }
          }}
        />
      {:else}
        <div class="w-full flex flex-col justify-center items-center h-40">
          <SubAtomLogo />
          <div>
            {properCase($appStore.product)}
          </div>
        </div>
      {/if}
      {#if message}
        <div class="font-medium px-4 text-center text-ass1 text-b2 -mb-4">
          {message}
        </div>
      {/if}
    </div>
    <AccountForm {isSignup} />
    {#if isSignup}
      <footer class="px-8">
        <div class="text-b3 text-fgs2 text-center">
          By signing up, you agree to our <Link
            href={Action.TERMS_OF_SERVICE}
            label="Terms of Service"
          />
          and
          <Link href={Action.PRIVACY_POLICY} label="Privacy Policy" />.
        </div>
      </footer>
    {/if}
  </div>
</div>
