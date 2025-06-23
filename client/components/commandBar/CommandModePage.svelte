<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore, currentTime } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import view from "$lib/client/stores/view.store";
  import { Action } from "$lib/client/types/action.enum";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { Display } from "$lib/client/types/view.type";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { player } from "../modal/modal.store";
  import ProfilePicture from "../settings/account/ProfilePicture.svelte";
  import { InteractionMode } from "../settings/interactionMode/interactionMode.type";
  import CommandBar from "./CommandBar.svelte";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import Tabs from "$lib/client/layout/topNav/tabs/Tabs.svelte";
  import { page } from "$app/stores";
  import PagePainterV2 from "$lib/client/layout/paint/PagePainterV2.svelte";
  import { ResourceAccessMode } from "../flux/resourceStores/resource.type";
  import { onMount } from "svelte";
  import { tabs } from "$lib/client/layout/topNav/tabs/tabs.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  let isInFocusMode = false;
  let pinnedItems: IRecordId[] = tabs.get() ?? [];

  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }
  onMount(() => {
    const unsubscribe = uiState.subscribe((x) => {
      pinnedItems = tabs.get() ?? [];
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });
  let isCmdHome = true;

  $: activeTab = $page.url.searchParams.get(ResourceAccessMode.TAB);
</script>

<div class="flex flex-col w-full h-full">
  <div>
    <Tabs
      {pinnedItems}
      isShowHome={true}
      {activeTab}
      on:home={(e) => {
        isCmdHome = e.detail;
        if (isCmdHome) appStore.toggleSearchParam([ResourceAccessMode.TAB]);
      }}
    />
  </div>
  {#if activeTab?.includes("page:")}
    <div class="w-full min-h-0 flex-1">
      <PagePainterV2 cmdPageLaunch={activeTab.split("page:")[1]} />
    </div>
  {:else if isCmdHome}
    <div
      class="flex flex-col dp:flex-row gap-6 w-full flex-1 min-h-0 justify-center items-center p-4 tp:p-8 dp:p-16"
    >
      <div
        class="dp:w-1/2 dp:h-full flex flex-col gap-6 dp:justify-center items-start"
      >
        <ProfilePicture context="cmd-page" />
        <button
          class="flex flex-col gap-1 items-start"
          on:click={() => {
            appStore.runAction(Action.SETTINGS);
          }}
        >
          <div class="text-xl text-fgs2 userdata">
            Hi {$account.userInfo?.nickName}!
          </div>
          <div class="text-fgs3">
            {formatDatetime($userPreferences, $currentTime)}
          </div>
        </button>
        {#if $player.isMiniOn}
          <Divider />
          <ComponentResolver path={$player.action + Action.CMD} />
        {/if}
      </div>
      <!-- {#if $view.display === Display.DP}
        <Divider
          orientation={Orientation.Vertical}
          colorStrength={ColorStrength.Strong}
        />
      {/if} -->
      <div
        class="h-96 w-[40rem] dp:h-[40rem] dp:w-1/2 flex justify-center items-center"
      >
        <div class="h-full w-full dp:h-2/3 dp:w-full flex items-center">
          <CommandBar isFullPageContext={true} />
        </div>
      </div>
    </div>
    <footer
      class="w-full flex flex-col gap-2 justify-center items-center h-1/6 text-fgs2 text-b2"
    >
      <div class="flex flex-col items-center gap-4">
        <span class="flex flex-row text-fgs3 gap-1">
          Press
          <ShortcutText shortcut={Action.GLOBAL_SEARCH} parentBgIndex={2} />
          to search
        </span>
        <Button
          label="Exit Command Mode"
          size={Size.sm}
          on:click={() => {
            uiState.setState(
              Action.MODE_OF_INTERACTION,
              InteractionMode.DEFAULT,
              {
                scope: UIStateScope.PRODUCT
              }
            );
          }}
        />
      </div>
    </footer>
  {:else}
    <slot />
  {/if}
</div>
