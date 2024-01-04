<script lang="ts">
  import { appStore } from "$lib/tidy/stores/app.store";
  import AccountForm from "./AccountForm.svelte";
  import PanelSwitcher from "$lib/tidy/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import Link from "$lib/tidy/elements/text/Link.svelte";
  import { page } from "$app/stores";
  import { LinkVariant } from "$lib/tidy/types/button.type";
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
</script>

<div class="flex flex-col w-full h-full justify-center">
  <div class="w-full h-3/4 flex flex-col gap-8 justify-start items-center">
    <!-- <div class="flex flex-col items-center">
      <SubAtomLogo subatom="pointron" isDark={true} />
      <div class="font-medium text-h3 text-fgs2">
        {$appStore.appData.name}
      </div>
    </div> -->
    <div>
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
    </div>
    {#if message}
      <div class="font-medium px-4 text-center text-fgs2 text-b2">
        {message}
      </div>
    {/if}
    <div class="h-4/5">
      <AccountForm {isSignup} />
    </div>
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
