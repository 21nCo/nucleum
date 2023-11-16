<script lang="ts">
  import {
    appStore,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import type { AppStore } from "$lib/tidy/types/appStore.type";
  import { onMount } from "svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import CpThumbnailList from "./CPThumbnailList.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import ProfileCpSection from "./account/ProfileCPSection.svelte";
  import { page } from "$app/stores";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import { ColorStrength } from "$lib/tidy/types/theme.type";
  import { sortPropertiesByOrder } from "$lib/tidy/utils/obj.utils";
  import ProductInfoFooter from "./about/ProductInfoFooter.svelte";
  import { retrieveCurrentColors } from "$lib/tidy/utils/theme.utils";
  import Panel from "$lib/tidy/layout/paint/Panel.svelte";
  $: isCpHome = $page?.url.pathname === "/cp";
  let cpConfiguration: any;
  let color = retrieveCurrentColors($userPreferences)?.a1;
  onMount(() => {
    appStore.subscribe((x: AppStore) => {
      if (x?.appData?.cp) {
        let cp = x.appData.cp;
        if (cp) cpConfiguration = sortPropertiesByOrder(cp);
      }
    });
  });
</script>

{#if $windowObject.isInPortraitMode && !isCpHome}
  <div class="flex flex-col gap-2 p-4">
    <div class="relative flex justify-center w-full min-h-[4rem]">
      <button
        class="absolute left-0 flex gap-1 items-center min-w-fit py-1.5 h-2 text-a1"
        style="top: 1.75rem;"
        on:click={() => {
          windowObject.gotoPath("/cp");
        }}
      >
        <Icon icon="chevleft" size={Size.sm} {color} />
        <div class="pr-1">Back</div>
      </button>
      <Text
        style={TextStyle.PANEL_HEADING}
        content={$windowObject.currentComponent?.label ?? ""}
      />
    </div>
    <slot />
  </div>
{:else if isCpHome || !$windowObject.isInPortraitMode}
  <div class="flex w-full h-full">
    <Panel title="Settings">
      <div
        slot="nonpadded"
        class="flex flex-col gap-8 flex-grow overflow-auto {$windowObject.isInPortraitMode
          ? 'pb-40'
          : 'pb-20'}"
      >
        <ProfileCpSection />
        {#if cpConfiguration}
          {#each Object.keys(cpConfiguration) as item}
            <CpThumbnailList
              sectionName={cpConfiguration[item].isHideTitle ? "" : item}
              items={cpConfiguration[item].children}
              orientation={cpConfiguration[item].orientation
                ? cpConfiguration[item].orientation
                : Orientation.Horizontal}
            />
          {/each}
        {/if}
        <ProductInfoFooter />
      </div>
      <slot name="right" slot="right">
        <div class="p-4 flex-grow flex flex-col gap-4 w-full items-start">
          {#if !isCpHome}
            <Text
              style={TextStyle.PANEL_HEADING}
              content={$windowObject.currentComponent?.label ?? ""}
            />
          {/if}
          <slot />
        </div>
      </slot>
    </Panel>
  </div>
{/if}
