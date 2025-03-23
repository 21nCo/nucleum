<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import type { IAppStore } from "$lib/client/types/appStore.type";
  import { onMount } from "svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import CpThumbnailList from "./SettingsList.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ProfileCpSection from "../account/ProfileCPSection.svelte";
  import { page } from "$app/stores";
  import { isValidArray, sortArrayByOrder } from "$lib/shared/utils/obj.utils";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import view from "$lib/client/stores/view.store";
  import appearance from "$lib/client/stores/appearance.store";
  import NavigationHeader from "$lib/client/elements/NavigationHeader.svelte";
  import SettingsFooter from "../SettingsFooter.svelte";

  $: isCpHome = $page.url.searchParams.get("setting") === null;
  let cpConfiguration: any;
  let color = retrieveCurrentColors($appearance)?.aps1;
  onMount(() => {
    const unsubscribe = appStore.subscribe((x: IAppStore) => {
      if (x?.appData?.cp) {
        let cp = x.appData.cp;
        if (isValidArray(cp)) cpConfiguration = sortArrayByOrder(cp);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });
</script>

{#if $view.isPortrait && !isCpHome}
  <div class="flex flex-col h-full w-full gap-2 px-4 py-2">
    <NavigationHeader
      label={$appStore.currentComponent?.label ?? ""}
      backCallback={() => {
        appStore.toggleSearchParam(["setting"]);
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
        class="flex flex-col gap-8 grow overflow-auto portrait:pb-40 pb-20"
      >
        <ProfileCpSection
          on:click={() =>
            appStore.toggleSearchParam({
              setting: "account"
            })}
        />
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
        <SettingsFooter />
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
