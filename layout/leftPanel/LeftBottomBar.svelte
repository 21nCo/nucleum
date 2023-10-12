<script lang="ts">
  import Element from "$lib/tidy/elements/Element.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { account, appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { onMount } from "svelte";
  export let isInThinMode: boolean = false;
  let isCpActive: boolean = false;
  onMount(() => {
    windowObject.subscribe((x) => {
      isCpActive = x?.currentPath?.includes("/cp");
    });
  });
</script>

<div class="w-full bg-bgs3 {isInThinMode ? 'h-24' : 'h-12'}">
  {#if $appStore.appData.leftPanelFooter === "simple"}
    <div
      class="w-full h-full flex {isInThinMode
        ? 'flex-col items-center'
        : 'flex-row'} justify-between items-center"
    >
      <Element
        parentBackgroundIndex={2}
        isActive={isCpActive}
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        classList="flex gap-2 h-full w-full items-center justify-center px-2 {!isInThinMode
          ? 'rounded-bl-lg'
          : ''}"
        on:click={() => windowObject.gotoPath("/cp")}
      >
        <Icon icon="settings" isActive={isCpActive} />
      </Element>
      <Element
        parentBackgroundIndex={2}
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        classList="flex h-full w-full justify-center px-2 items-center gap-1  {isInThinMode
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
      </Element>
    </div>
  {:else}
    <!-- else content here -->
  {/if}
</div>
