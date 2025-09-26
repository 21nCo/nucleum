<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import SettingsList from "./SettingsList.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ProfileCpSection from "../account/ProfileCPSection.svelte";
  import { page } from "$app/stores";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import view from "$lib/client/stores/view.store";
  import appearance from "$lib/client/stores/appearance.store";
  import NavigationHeader from "$lib/client/elements/NavigationHeader.svelte";
  import SettingsFooter from "../SettingsFooter.svelte";
  import { resolveProductConfig } from "$lib/client/products/product.config";
  import OfflineStatusMessage from "$lib/client/elements/feedback/OfflineStatusMessage.svelte";
  export let isShowBackButton: boolean = false;
  $: isCpHome = $page.url.searchParams.get("setting") === null;
  let color = retrieveCurrentColors($appearance)?.aps1;
  const cpConfiguration = resolveProductConfig().settings;
</script>

{#if $view.isPortrait && !isCpHome}
  <div class="flex flex-col h-full w-full gap-2 px-4 py-2 otop:pt-12">
    <NavigationHeader
      label={$appStore.currentComponent?.label ?? ""}
      backCallback={() => {
        appStore.toggleSearchParam([AppSearchParam.SETTING]);
      }}
    />
    <div class="flex flex-col flex-grow">
      <slot />
    </div>
  </div>
{:else if isCpHome || !$view.isPortrait}
  <div class="flex w-full h-full bg-bgs2">
    <Panel title="Settings" {isShowBackButton} on:back parentBgIndex={2}>
      <div
        slot="nonpadded"
        class="flex flex-col gap-8 grow overflow-auto portrait:pb-40 pb-20"
      >
        <div class="pt-4">
          <ProfileCpSection
            on:click={() =>
              appStore.toggleSearchParam({
                [AppSearchParam.SETTING]: "account"
              })}
            parentBackgroundIndex={0}
          />
        </div>
        {#if cpConfiguration}
          {#each cpConfiguration as item}
            <SettingsList
              sectionName={item.isHideTitle ? "" : item.section}
              items={item.children}
              orientation={item.orientation
                ? item.orientation
                : Orientation.Horizontal}
            />
          {/each}
        {/if}
        <SettingsFooter />
      </div>
      <div slot="toprightactions">
        <OfflineStatusMessage />
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
