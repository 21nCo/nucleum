<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import type { AppStore } from "$lib/client/types/appStore.type";
  import { onMount } from "svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import CpThumbnailList from "./CPThumbnailList.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ProfileCpSection from "./account/ProfileCPSection.svelte";
  import { page } from "$app/stores";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { isValidArray, sortArrayByOrder } from "$lib/client/utils/obj.utils";
  import ProductInfoFooter from "./about/ProductInfoFooter.svelte";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import view from "$lib/client/stores/view.store";
  import account from "$lib/client/stores/account.store";
  import appearance from "$lib/client/stores/appearance.store";
  import BackButton from "$lib/client/elements/button/BackButton.svelte";
  import NavigationHeader from "$lib/client/elements/NavigationHeader.svelte";
  $: isCpHome = $page?.url.pathname === "/cp" || $page?.url.pathname === "/cp/";
  let cpConfiguration: any;
  let color = retrieveCurrentColors($appearance)?.aps1;
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
    <NavigationHeader
      label={$view.currentComponent?.label ?? ""}
      backCallback={() => {
        appStore.gotoPath("/cp");
      }}
    />
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
        <ProfileCpSection on:click={() => appStore.gotoPath("/cp/account")} />
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
