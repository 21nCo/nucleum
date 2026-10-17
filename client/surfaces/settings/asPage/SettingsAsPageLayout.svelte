<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import type { Snippet } from "svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import SettingsList from "@nucleum/surfaces/settings/asPage/SettingsList.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import ProfileCpSection from "@nucleum/surfaces/account/profile/ProfileCPSection.svelte";
  import { page } from "$app/stores";
  import { retrieveCurrentColors } from "@21n/theme/color-presentation";
  import Panel from "@nucleum/shell/paint/Panel.svelte";
  import view from "@21n/ui/environment/view.store";
  import appearance from "@nucleum/shared-state/appearance/appearance.store";
  import NavigationHeader from "@nucleum/shell/navigation/components/NavigationHeader.svelte";
  import SettingsFooter from "@nucleum/surfaces/settings/SettingsFooter.svelte";
  import { requireSurfaceProductConfig } from "@nucleum/shared-state/product/surface-config-host";
  import OfflineStatusIndicator from "@nucleum/surfaces/settings/sync/OfflineStatusIndicator.svelte";
  let {
    isShowBackButton = false,
    children = undefined,
    right = undefined
  }: {
    isShowBackButton?: boolean;
    children?: Snippet | undefined;
    right?: Snippet | undefined;
  } = $props();
  const selectedSetting = $derived(
    $page.url.searchParams.get(AppSearchParam.SETTING)
  );
  const isCpHome = $derived(selectedSetting === null);
  const selectedSettingLabel = $derived(
    (selectedSetting
      ? requireCommandHost().resolveAction(selectedSetting)
      : $appStore.currentComponent
    )?.label ?? ""
  );
  let color = retrieveCurrentColors($appearance)?.aps1;
  const cpConfiguration = requireSurfaceProductConfig().settings;
  void color;
</script>

{#if $view.isPortrait && !isCpHome}
  <div class="flex flex-col h-full w-full gap-2 px-4 py-2 otop:pt-12">
    <NavigationHeader
      label={selectedSettingLabel}
      backCallback={() => {
        navigation.toggleSearchParam([AppSearchParam.SETTING]);
      }}
    />
    <div class="flex flex-col flex-grow">
      {@render children?.()}
    </div>
  </div>
{:else if isCpHome || !$view.isPortrait}
  <div class="flex w-full h-full bg-bgs2">
    <Panel
      title="Settings"
      {isShowBackButton}
      parentBgIndex={2}
      onBack={() => {
        navigation.toggleSearchParam([AppSearchParam.SETTING]);
      }}
    >
      {#snippet nonPadded()}
        <div
          class="flex flex-col gap-8 grow overflow-auto portrait:pb-40 pb-20"
        >
          <div class="pt-4">
            <ProfileCpSection
              onclick={() =>
                navigation.toggleSearchParam({
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
      {/snippet}
      {#snippet topRightActions()}
        <OfflineStatusIndicator />
      {/snippet}
      {#snippet right()}
        {#if right}
          {@render right?.()}
        {:else}
          <div class="p-4 flex flex-col gap-4 w-full h-full items-start">
            {#if !isCpHome}
              <Text
                style={TextStyle.PANEL_HEADING}
                content={selectedSettingLabel}
              />
            {/if}
            <div class="w-full flex-grow">
              {@render children?.()}
            </div>
          </div>
        {/if}
      {/snippet}
    </Panel>
  </div>
{/if}
