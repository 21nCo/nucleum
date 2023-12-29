<script lang="ts">
  import { account, appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import AccountForm from "./AccountForm.svelte";
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";
  import PanelSwitcher from "$lib/tidy/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { fade, slide } from "svelte/transition";
  import Link from "$lib/tidy/elements/text/Link.svelte";
  let isSignup = true;
  onMount(() => {
    const sub = account.subscribe((value) => {
      if (value.isLoggedIn) {
        windowObject.gotoPath("/");
      }
    });
    return () => {
      sub();
    };
  });
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
    <div class="h-4/5">
      <AccountForm {isSignup} />
    </div>
    {#if isSignup}
      <footer class="px-8">
        <div class="text-b3 text-fgs2 text-center">
          By signing up, you agree to our <Link
            href={$appStore.appData?.urls?.terms}
            label="Terms of Service"
          />
          and
          <Link
            href={$appStore.appData?.urls?.privacypolicy}
            label="Privacy Policy"
          />.
        </div>
      </footer>
    {/if}
  </div>
</div>
