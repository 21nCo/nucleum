<script lang="ts">
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
  import type { AppStore } from "$lib/tidy/types/appStore.type";
  import type { ControlPanelConfiguration } from "$lib/tidy/types/controlpanel.type";
  import { onMount } from "svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import CpThumbnailList from "./CPThumbnailList.svelte";
  import Element from "$lib/tidy/elements/Element.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import ProfileCpSection from "./account/ProfileCPSection.svelte";
  import { page } from "$app/stores";
  // export let isCpHome = window.location.pathname === "/cp";
  $: isCpHome = $page.url.pathname === "/cp";
  let cpConfiguration: ControlPanelConfiguration;
  onMount(() => {
    appStore.subscribe((x: AppStore) => {
      if (x?.appData?.cp) {
        cpConfiguration = x.appData.cp;
      }
    });
  });
</script>

{#if $windowObject.isInPortraitMode && !isCpHome}
  <div class="flex flex-col gap-2 p-4">
    <Element
      classList="flex max-w-min bg-bgs2 px-2"
      on:click={() => {
        windowObject.gotoPath("/cp");
      }}
    >
      <!-- <Icon icon="chevron-left" /> -->
      <span class="text-b3">back</span>
    </Element>
    <slot />
  </div>
{:else if isCpHome || !$windowObject.isInPortraitMode}
  <div class="flex w-full h-full">
    <div
      class="flex flex-col h-full {$windowObject.isInPortraitMode
        ? 'w-full'
        : 'w-96'} "
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
          {$appStore.appData?.name ??
            "" + " v" + $appStore.appData?.version ??
            ""}
        </div>
      </div>
    </div>
    {#if !$windowObject.isInPortraitMode}
      <div class="border-r-2 border-bgs2" />
      <div class="p-4 flex-grow">
        <slot />
      </div>
    {/if}
  </div>
{/if}
