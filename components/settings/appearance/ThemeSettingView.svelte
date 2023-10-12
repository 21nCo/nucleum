<script lang="ts">
  import { appStore, userPreferences } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import Switcher from "$lib/tidy/elements/switcher/Switcher.svelte";
  import type { ColorScheme } from "$lib/tidy/types/appConstants.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import ColorSchemeSwitcher from "$lib/tidy/components/settings/ColorSchemeSwitcher.svelte";
  import SizeFactorSetting from "$lib/tidy/components/settings/appearance/accessibility/sizeFactor/SizeFactorSetting.svelte";
  import OpenPreviewMode from "./OpenPreviewMode.svelte";
  import ControlPanelLayout from "../ControlPanelLayout.svelte";
  export let parentBackgroundIndex: number = 1;
  let selectedThemeIndex: number = 0;
  let selectedColorSchemeIndex: number;
  let selectedLightnessIndex: number;
  let selectedTempSchemeIndex: number = 0;
  let filteredColorSchemes: ColorScheme[] = [];
  onMount(() => {
    selectedLightnessIndex = $userPreferences.colorScheme?.isDark ? 1 : 0;
    refreshColorSchemes();
  });
  function refreshColorSchemes(e: any = undefined) {
    filteredColorSchemes = $appStore.appConstants.colorSchemes?.filter(
      (x: ColorScheme) => {
        return (
          (selectedLightnessIndex == 0 && !x.isDark) ||
          (selectedLightnessIndex == 1 && x.isDark)
        );
      }
    );
    if (e) {
      selectedColorSchemeIndex = 0;
      saveColorScheme();
    } else {
      selectedColorSchemeIndex = filteredColorSchemes?.findIndex((x: any) => {
        return x.label === $userPreferences.colorScheme.label;
      });
    }
  }
  function saveColorScheme() {
    $userPreferences.colorScheme =
      selectedColorSchemeIndex != undefined
        ? filteredColorSchemes[selectedColorSchemeIndex]
        : $userPreferences.colorScheme;
    //todo showChangesFeedback();
  }
  function saveTheme() {
    $userPreferences.theme =
      selectedThemeIndex != undefined
        ? $appStore.appConstants.themes[selectedThemeIndex]
        : $userPreferences.theme;
    //showChangesFeedback();
  }
  function onThemeChange() {
    refreshColorSchemes();
    saveTheme();
  }
  function onTempSchemeChange(event: any) {
    $userPreferences.tempColorScheme =
      selectedTempSchemeIndex != undefined
        ? $appStore.appConstants.tempColorSchemes[selectedTempSchemeIndex]
        : $userPreferences.tempColorScheme;
  }
</script>

<div class="flex flex-col gap-8">
  {#if $appStore.isDebugMode}
    <Switcher
      label="Theme"
      {parentBackgroundIndex}
      items={$appStore.appConstants.themes}
      selectionStyle={SelectionItemActiveStyle.CIRCLE}
      on:switch={onThemeChange}
      bind:selectedIndex={selectedThemeIndex}
    />
  {/if}
  <Switcher
    label="Color scheme"
    {parentBackgroundIndex}
    size={Size.sm}
    items={["light", "dark"]}
    selectionStyle={SelectionItemActiveStyle.NONE}
    on:switch={refreshColorSchemes}
    bind:selectedIndex={selectedLightnessIndex}
  />
  <ColorSchemeSwitcher
    {parentBackgroundIndex}
    colorSchemes={filteredColorSchemes}
    bind:selected={selectedColorSchemeIndex}
    on:switch={saveColorScheme}
  />
  {#if $appStore.isDebugMode}
    <div>
      <Text style={TextType.SECTION_HEADING}>THEME TRAILS</Text>
      <Switcher
        {parentBackgroundIndex}
        items={$appStore.appConstants.tempColorSchemes}
        selectionStyle={SelectionItemActiveStyle.SIDEBAR}
        on:switch={onTempSchemeChange}
        bind:selectedIndex={selectedTempSchemeIndex}
      />
    </div>
  {/if}
</div>
