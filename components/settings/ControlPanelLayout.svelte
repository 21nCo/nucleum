<script lang="ts">
  import { appStore, userPreferences } from "$lib/tidy/stores/app.store";
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
  import { isValidArray, sortArrayByOrder } from "$lib/tidy/utils/obj.utils";
  import ProductInfoFooter from "./about/ProductInfoFooter.svelte";
  import { retrieveCurrentColors } from "$lib/tidy/utils/theme.utils";
  import Panel from "$lib/tidy/layout/paint/Panel.svelte";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import view from "$lib/tidy/stores/view.store";
  import account from "$lib/tidy/stores/account.store";
  $: isCpHome = $page?.url.pathname === "/cp" || $page?.url.pathname === "/cp/";
  let cpConfiguration: any;
  let color = retrieveCurrentColors($userPreferences)?.a1;
  onMount(() => {
    appStore.subscribe((x: AppStore) => {
      if (x?.appData?.cp) {
        let cp = x.appData.cp;
        console.log({ cp });
        if (isValidArray(cp)) cpConfiguration = sortArrayByOrder(cp);
      }
    });
  });
</script>

{#if $view.isPortrait && !isCpHome}
  <div class="flex flex-col h-full gap-2 px-4 py-2">
    <div class="relative flex justify-center w-full h-16 min-h-[4rem]">
      <button
        class="absolute left-0 flex gap-1 items-center min-w-fit py-1.5 h-2 text-a1"
        style="top: 1.75rem;"
        on:click={() => {
          view.gotoPath("/cp");
        }}
      >
        <Icon icon="chevleft" size={Size.sm} {color} />
        <div class="pr-1">Back</div>
      </button>
      <Text
        style={TextStyle.PANEL_HEADING}
        content={$view.currentComponent?.label ?? ""}
      />
    </div>
    <div class="flex flex-col flex-grow">
      <slot />
    </div>
  </div>
{:else if isCpHome || !$view.isPortrait}
  <div class="flex w-full h-full">
    <Panel title="Settings">
      <div
        slot="nonpadded"
        class="flex flex-col gap-8 grow overflow-auto {$view.isPortrait
          ? 'pb-40'
          : 'pb-20'}"
      >
        <ProfileCpSection on:click={() => view.gotoPath("/cp/account")} />
        {#if cpConfiguration}
          {#each cpConfiguration as item}
            <CpThumbnailList
              sectionName={item.isHideTitle ? "" : item.section}
              items={item.children}
              orientation={item.orientation
                ? item.orientation
                : Orientation.Horizontal}
            />
          {/each}
        {/if}
        <div class="flex w-full justify-center">
          <Button
            width="w-2/5"
            icon="logout"
            label="Sign out"
            on:click={() => {
              account.signOut();
            }}
          />
        </div>
        <ProductInfoFooter />
      </div>
      <slot name="right" slot="right">
        <div class="p-4 flex flex-col gap-4 w-full h-full items-start">
          {#if !isCpHome}
            <Text
              style={TextStyle.PANEL_HEADING}
              content={$view.currentComponent?.label ?? ""}
            />
          {/if}
          <div class="w-full flex-grow">
            <slot />
          </div>
        </div>
      </slot>
    </Panel>
  </div>
{/if}
