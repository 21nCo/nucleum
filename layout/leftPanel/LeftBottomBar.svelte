<script lang="ts">
  import Element from "$lib/tidy/elements/Element.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { account, appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  export let isInThinMode: boolean = false;
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
        isActive={$windowObject.currentPath?.includes("settings")}
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        classList="flex gap-2 h-full w-full items-center justify-center px-2 rounded-lg"
        on:click={() => windowObject.gotoPath("/settings")}
      >
        <Icon
          icon="settings"
          size={Size.lg}
          isActive={$windowObject.currentPath?.includes("settings")}
        />
      </Element>
      <Element
        parentBackgroundIndex={2}
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        classList="flex h-full w-full justify-center px-2 items-center gap-1 rounded-lg"
        on:click={() => {
          if ($account.isLoggedIn) account.signOut();
          windowObject.gotoPath("/settings/account");
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
