<script lang="ts">
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
  import type { AppStore } from "$lib/tidy/types/appStore.type";
  import type { ControlPanelConfiguration } from "$lib/tidy/types/controlpanel.type";
  import { onDestroy, onMount } from "svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import CpThumbnailList from "./CPThumbnailList.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import ProfileCpSection from "./account/ProfileCPSection.svelte";
  import { page } from "$app/stores";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  $: isCpHome = $page?.url.pathname === "/cp";
  let cpConfiguration: ControlPanelConfiguration;
  const sub = page.subscribe((x) => {
    if (x?.url?.pathname === "/cp") {
      $windowObject.isHideMenu = false;
    } else if ($windowObject.isInPortraitMode) {
      $windowObject.isHideMenu = true;
    }
  });
  onMount(() => {
    appStore.subscribe((x: AppStore) => {
      if (x?.appData?.cp) {
        cpConfiguration = x.appData.cp;
      }
    });
  });
  onDestroy(sub);
</script>

{#if $windowObject.isInPortraitMode && !isCpHome}
  <div class="flex flex-col gap-2 p-4">
    <div class="relative flex justify-center w-full min-h-[4rem]">
      <button
        class="absolute left-0 flex gap-1 items-center min-w-fit py-1.5 h-2 text-accent1"
        style="top: 1.75rem;"
        on:click={() => {
          windowObject.gotoPath("/cp");
        }}
      >
        <Icon icon="chevleft" size={Size.sm} color="accent1" />
        <div class="pr-1">Back</div>
      </button>
      <Text style={TextType.PANEL_HEADING}>
        {$windowObject.currentComponent?.label}
      </Text>
    </div>
    <slot />
  </div>
{:else if isCpHome || !$windowObject.isInPortraitMode}
  <div class="flex w-full h-full">
    <div
      class="flex flex-col h-full {$windowObject.isInPortraitMode
        ? 'w-full'
        : 'w-96 min-w-[24rem]'} "
    >
      <div class="pl-4">
        <Text style={TextType.PAGE_HEADING}>Control Panel</Text>
      </div>
      <div
        class="flex flex-col gap-8 flex-grow overflow-auto {$windowObject.isInPortraitMode
          ? 'pb-40'
          : 'pb-20'}"
      >
        <ProfileCpSection />
        {#if cpConfiguration?.modules && cpConfiguration?.modules.length > 0}
          <CpThumbnailList
            items={cpConfiguration.modules}
            section={"MODULES"}
          />
        {/if}
        {#if cpConfiguration?.customization && cpConfiguration?.customization.length > 0}
          <CpThumbnailList
            items={cpConfiguration.customization}
            orientation={Orientation.Horizontal}
            section={"CUSTOMIZATION"}
          />
        {/if}
        {#if cpConfiguration?.app && cpConfiguration?.app.length > 0}
          <CpThumbnailList
            items={cpConfiguration.app}
            orientation={Orientation.Horizontal}
            section={"APP"}
          />
        {/if}
        <div class="flex w-full justify-center text-fgs3 text-b3 pt-20">
          {($appStore.appData?.name ?? "") +
            (" v" + $appStore.appData?.version ?? "")}
        </div>
      </div>
    </div>
    {#if !$windowObject.isInPortraitMode}
      <div class="border-r-2 border-bgs2" />
      <div class="p-4 flex-grow flex flex-col gap-4 w-full items-start">
        {#if !isCpHome}
          <Text style={TextType.PANEL_HEADING}>
            {$windowObject.currentComponent?.label}
          </Text>
        {/if}
        <slot />
      </div>
    {/if}
  </div>
{/if}
