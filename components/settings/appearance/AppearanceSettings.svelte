<script lang="ts">
  import DatePicker from "$lib/tidy/elements/DatePicker.svelte";
  import TextInput from "$lib/tidy/elements/TextInput.svelte";
  import {
    appEvents,
    appStore,
    userPreferences,
  } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import Switcher from "$lib/tidy/elements/switcher/Switcher.svelte";
  import type { ColorScheme } from "$lib/tidy/types/appConstants.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import Button from "$lib/tidy/elements/Button.svelte";
  import { EventType } from "$lib/tidy/types/event.enum";
  import { goto } from "$app/navigation";

  import CheckboxInput from "$lib/tidy/elements/CheckboxInput.svelte";
  import {
    pointronConstants,
    userLocalPreferences,
  } from "$lib/local/stores/local.store";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextType } from "$lib/tidy/types/text.enum";
  import ColorSchemeSwitcher from "$lib/tidy/components/settings/ColorSchemeSwitcher.svelte";
  import SizeFactorSetting from "$lib/tidy/components/settings/appearance/accessibility/sizeFactor/SizeFactorSetting.svelte";
  export let parentBackgroundIndex: number = 1;
  export let isInPreviewMode: boolean = false;
  let selectedThemeIndex: number = 0;
  let selectedColorSchemeIndex: number;
  let selectedLightnessIndex: number;
  let selectedTempSchemeIndex: number = 0;
  let filteredColorSchemes: ColorScheme[] = [];
  let colorSchemeLabels: string[] = [];
  let changesFeedback = "";
  $: colorSchemeLabels = filteredColorSchemes.map((x: ColorScheme) => {
    return x.label;
  });
  let backgroundColor = "";
  $: {
    if (parentBackgroundIndex === 1) {
      backgroundColor = " bg-bgs2";
    } else if (parentBackgroundIndex === 2) {
      backgroundColor = " bg-bgs3";
    } else if (parentBackgroundIndex === 0) {
      backgroundColor = " bg-bgs1";
    }
  }
  onMount(() => {
    selectedLightnessIndex = $userPreferences.colorScheme?.isDark ? 1 : 0;
    refreshColorSchemes();
  });
  function onDateChange(event: any) {
    $userPreferences.birthday = event.detail.date;
  }
  function refreshColorSchemes(e: any = undefined) {
    filteredColorSchemes = $appStore.appConstants.colorSchemes.filter(
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
      selectedColorSchemeIndex = filteredColorSchemes.findIndex((x: any) => {
        return x.label === $userPreferences.colorScheme.label;
      });
    }
  }
  function saveColorScheme() {
    $userPreferences.colorScheme =
      selectedColorSchemeIndex != undefined
        ? filteredColorSchemes[selectedColorSchemeIndex]
        : $userPreferences.colorScheme;
    showChangesFeedback();
  }
  function saveTheme() {
    $userPreferences.theme =
      selectedThemeIndex != undefined
        ? $appStore.appConstants.themes[selectedThemeIndex]
        : $userPreferences.theme;
    showChangesFeedback();
  }
  function showChangesFeedback() {
    changesFeedback = "All changes saved";
    setTimeout(() => {
      changesFeedback = "";
    }, 1500);
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

<div class="flex flex-col gap-8 w-full">
  {#if isInPreviewMode}
    <div class="text-xs text-center text-fgs3 h-1">
      {changesFeedback ? changesFeedback : ""}
    </div>
  {:else}
    <div>
      <Button
        on:click={() => {
          appEvents.publish(EventType.SHOW_APPEARANCE_PREVIEW, true);
          goto("/");
        }}
        label="Open Preview Mode"
      />
    </div>
  {/if}
  <div class="flex flex-col gap-6 w-full">
    <TextInput
      label="Nickname"
      bind:value={$userPreferences.nickName}
      placeholder="nickname"
      {parentBackgroundIndex}
    />
    <div class="flex gap-8">
      <CheckboxInput
        label="Enable Age Counter"
        bind:checked={$userLocalPreferences.isEnableAgeCounter}
      />
    </div>
    {#if $userLocalPreferences.isEnableAgeCounter}
      <div class="flex flex-col gap-1">
        <div class="text-fgs2">Birthday</div>
        <div>
          <DatePicker
            {parentBackgroundIndex}
            date={new Date($userPreferences.birthday ?? new Date())}
            on:change={onDateChange}
          />
        </div>
      </div>
    {/if}
    <div class="flex flex-col gap-1 w-full">
      <div class="text-fgs2">Timer mode</div>
      <Switcher
        {parentBackgroundIndex}
        items={$pointronConstants.timerModes}
        bind:selected={$userLocalPreferences.timerMode}
      />
    </div>
  </div>
  <div class="flex flex-col gap-6 w-full">
    <div>
      <Text type={TextType.SECTION_HEADING}>THEME</Text>
      <Switcher
        {parentBackgroundIndex}
        items={$appStore.appConstants.themes}
        selectionStyle={SelectionItemActiveStyle.CIRCLE}
        on:switch={onThemeChange}
        bind:selected={selectedThemeIndex}
      />
    </div>
    <div class="flex flex-col gap-4 w-full">
      <div class="flex flex-col gap-2">
        <div class="text-fgs2">Color scheme</div>
        <Switcher
          {parentBackgroundIndex}
          size={Size.sm}
          items={["light", "dark"]}
          selectionStyle={SelectionItemActiveStyle.NONE}
          on:switch={refreshColorSchemes}
          bind:selected={selectedLightnessIndex}
        />
      </div>
      <ColorSchemeSwitcher
        {parentBackgroundIndex}
        colorSchemes={filteredColorSchemes}
        bind:selected={selectedColorSchemeIndex}
        on:switch={saveColorScheme}
      />
    </div>
  </div>
  <div>
    <SizeFactorSetting />
  </div>
  {#if $appStore.isDebugMode}
    <div>
      <Text type={TextType.SECTION_HEADING}>THEME TRAILS</Text>
      <Switcher
        {parentBackgroundIndex}
        items={$appStore.appConstants.tempColorSchemes}
        selectionStyle={SelectionItemActiveStyle.SIDEBAR}
        on:switch={onTempSchemeChange}
        bind:selected={selectedTempSchemeIndex}
      />
    </div>
  {/if}
</div>
