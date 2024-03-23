<script lang="ts">
  import {
    appConstants,
    appStore,
    userPreferences
  } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import Switcher from "$lib/tidy/elements/switcher/Switcher.svelte";
  import { AppSkin, Theme } from "$lib/tidy/types/appearance.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import appearance from "$lib/tidy/stores/appearance.store";
  import ColorSchemeSelector from "$lib/tidy/components/settings/appearance/ColorSchemeSelector.svelte";
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
  {#if $appearance.skin === AppSkin.Clean}
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
  <ColorSchemeSelector
    {parentBackgroundIndex}
    theme={$appearance.userThemeSetting}
    selectedSchemeId={$appearance.colorScheme.id}
    on:select={saveColorScheme}
  />
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
</div>
