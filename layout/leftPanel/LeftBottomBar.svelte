<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import {
    account,
    appStore,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { bg } from "$lib/tidy/utils/theme.utils";
  import { onMount } from "svelte";
  export let isInThinMode: boolean = false;
  export let isRounded: boolean = false;
  //let isCpActive: boolean = false;
  $: isCpActive =
    $page.params.route?.includes("/cp") || $page.route.id?.includes("/cp");
  // onMount(() => {
  //   windowObject.subscribe((x) => {
  //     console.log({ x });
  //     isCpActive = x?.currentPath?.includes("/cp");
  //   });
  // });
</script>

<div
  class="w-full {bg($userPreferences.theme, 2)} {isInThinMode
    ? 'h-24'
    : 'h-12'}"
>
  {#if $appStore.appData.leftPanelFooter === "simple"}
    <div
      class="w-full h-full flex {isInThinMode
        ? 'flex-col items-center'
        : 'flex-row'} justify-between items-center"
    >
      <button
        class="flex gap-2 h-full w-full items-center justify-center px-2 {!isInThinMode &&
        isRounded
          ? 'rounded-bl-lg'
          : ''} {isCpActive ? 'bg-a1' : ''}"
        on:click={() => windowObject.gotoPath("/cp")}
      >
        <Icon
          icon="settings"
          isActive={isCpActive}
          selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        />
      </button>
      <button
        class="flex h-full w-full justify-center px-2 items-center gap-1 {isInThinMode
          ? 'rounded-b-lg'
          : 'rounded-br-lg'}"
        on:click={() => {
          if ($account.isLoggedIn) account.signOut();
          windowObject.gotoPath("/cp/account");
        }}
      >
        <Icon icon={$account.isLoggedIn ? "logout" : "login"} />
        {#if !isInThinMode}
          <span class="text-sm">{$account.isLoggedIn ? "logout" : "login"}</span
          >
        {/if}
      </button>
    </div>
  {:else}
    <!-- else content here -->
  {/if}
</div>
