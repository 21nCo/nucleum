<script lang="ts">
  import {
    appConstants,
    appStore,
    userPreferences
  } from "$lib/client/stores/app.store";
  import { onMount } from "svelte";
  import Switcher from "$lib/client/elements/switcher/Switcher.svelte";
  import { AppSkin, Theme } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import appearance from "$lib/client/stores/appearance.store";
  import ColorSchemeSelector from "$lib/client/components/settings/appearance/ColorSchemeSelector.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  export let parentBackgroundIndex: number = 1;
  let selectedSkinIndex: number = 0;
  let selectedTheme: number;
  let selectedTempSchemeIndex: number = 0;
  onMount(() => {
    selectedSkinIndex = appConstants.themes.findIndex(
      (x) => x == $appearance.skin
    );
    selectedTheme =
      $appearance.userThemeSetting == Theme.LIGHT
        ? 0
        : $appearance.userThemeSetting == Theme.DARK
          ? 1
          : 2;
  });
  function saveColorScheme(e: CustomEvent) {
    appearance.setColorScheme(e.detail);
    //todo showChangesFeedback();
  }
  function saveSkin() {
    $appearance.skin =
      selectedSkinIndex != undefined
        ? appConstants.themes[selectedSkinIndex]
        : $appearance.skin;
    //showChangesFeedback();
  }
  function onSkinChange(e: any) {
    saveSkin();
  }
  function onTempSchemeChange(event: any) {
    $userPreferences.tempColorScheme =
      selectedTempSchemeIndex != undefined
        ? appConstants.tempColorSchemes[selectedTempSchemeIndex]
        : $userPreferences.tempColorScheme;
  }
  function switchTheme(e: any) {
    const theme = Object.values(Theme)[selectedTheme];
    appearance.modifyUserThemeSetting(theme);
  }

  //TODO - use change event on switchInput instead
  $: appearance.modifySyncWithSystem($appearance.isSyncWithSystem);
</script>

<div class="flex flex-col gap-8 max-w-md">
  <!-- <Switcher
    label="Theme"
    {parentBackgroundIndex}
    items={appConstants.themes.map((x) => properCase(x))}
    selectionStyle={SelectionItemActiveStyle.CIRCLE_WITH_BACKGROUND}
    on:switch={onSkinChange}
    bind:selectedIndex={selectedThemeIndex}
  /> -->
  <SwitchInput
    bind:checked={$appearance.isSyncWithSystem}
    on:change={switchTheme}
    isExpanded={true}
    label={{
      label: "Sync with system",
      tooltip: {
        body: "Enable this to automatically switch between light and dark themes based on your system settings."
      }
    }}
  />
  {#if $appearance.skin === AppSkin.Clean && !$appearance.isSyncWithSystem}
    <Switcher
      label="Theme"
      {parentBackgroundIndex}
      size={Size.sm}
      items={Object.values(Theme)}
      selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
      on:switch={switchTheme}
      bind:selectedIndex={selectedTheme}
    />
  {:else if $appearance.skin === AppSkin.Glassy}
    <div class="text-b3 text-fgs2">{`[ Experimental theme ]`}</div>
  {/if}
  {#if !$appearance.isSyncWithSystem}
    <ColorSchemeSelector
      {parentBackgroundIndex}
      theme={$appearance.userThemeSetting}
      selectedSchemeId={$appearance.colorScheme.id}
      on:select={saveColorScheme}
    />
  {:else}
    <div class="flex flex-col gap-4">
      <div>
        <ColorSchemeSelector
          label="Light color scheme"
          {parentBackgroundIndex}
          theme={Theme.LIGHT}
          selectedSchemeId={$appearance.lightColorSchemeId}
          on:select={saveColorScheme}
        />
      </div>
      <div>
        <ColorSchemeSelector
          label="Dark color scheme"
          {parentBackgroundIndex}
          theme={Theme.DARK}
          selectedSchemeId={$appearance.darkColorSchemeId}
          on:select={saveColorScheme}
        />
      </div>
    </div>
  {/if}
  {#if $appStore.isDebugMode}
    <div>
      <Switcher
        label="Glassy theme trails"
        {parentBackgroundIndex}
        items={appConstants.tempColorSchemes}
        selectionStyle={SelectionItemActiveStyle.SIDEBAR}
        on:switch={onTempSchemeChange}
        bind:selectedIndex={selectedTempSchemeIndex}
      />
    </div>
  {/if}
  {#if $appearance.isSyncWithSystem}
    <InlineInfoBanner
      content="Dark and light themes will be switched automatically according to the system
setting on your device."
      action="faqs"
    />
  {/if}
</div>
