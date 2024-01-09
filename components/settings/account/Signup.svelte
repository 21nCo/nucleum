<script lang="ts">
  import { account, appStore, windowObject } from "$lib/tidy/stores/app.store";
  import AccountForm from "./signup/AccountForm.svelte";
  import PanelSwitcher from "$lib/tidy/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import Link from "$lib/tidy/elements/text/Link.svelte";
  import { page } from "$app/stores";
  import { LinkVariant } from "$lib/tidy/types/button.type";
  import { onMount } from "svelte";
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
    if ($account.isLoggedIn) windowObject.gotoPath("/");
  });
</script>

<div class="flex flex-col w-full h-full justify-start pt-8 xl:pt-12">
  <div
    class="w-full flex flex-col justify-start items-center {$windowObject.scale >
    0.6
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
      <PanelSwitcher
        items={["Sign up", "Sign in"]}
        selectedIndex={0}
        style={PanelSwitcherStyle.BOTTOMBAR}
        on:switch={(e) => {
          console.log(e.detail);
          if (e.detail.selected === 0) {
            isSignup = true;
          } else {
            isSignup = false;
          }
        }}
      />
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
            href={$appStore.appData?.urls?.tos}
            variant={LinkVariant.INLINE}
            label="Terms of Service"
          />
          and
          <Link
            href={$appStore.appData?.urls?.privacy}
            variant={LinkVariant.INLINE}
            label="Privacy Policy"
          />.
        </div>
      </footer>
    {/if}
  </div>
</div>
