<script lang="ts">
  import { appConstants, appStore } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { onMount } from "svelte";
  import { AppSkin, Theme } from "@21n/types/appearance.type";
  import { Size } from "@21n/types/size.enum";
  import appearance from "@21n/stores/appearance.store";
  import ColorSchemeSelector from "@21n/components/settings/appearance/ColorSchemeSelector.svelte";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import ScrollView from "@21n/layout/scrollView/ScrollView.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import view from "@21n/stores/view.store";
  import TypefaceSelector from "@21n/components/settings/appearance/TypefaceSelector.svelte";
  export let parentBackgroundIndex: number = 1;
  let selectedSkinIndex: number = 0;
  let selectedTheme: Theme;
  let selectedTempSchemeIndex: number = 0;
  onMount(() => {
    selectedSkinIndex = appConstants.themes.findIndex(
      (x) => x == $userPreferences?.appearance?.skin
    );
    selectedTheme = $appearance.userThemeSetting;
    if ($userPreferences.appearance.skin !== AppSkin.Clean) {
      $userPreferences.appearance.skin = AppSkin.Clean;
    }
  });
  function saveColorScheme(e: CustomEvent) {
    appearance.setColorScheme(e.detail);
    //todo showChangesFeedback();
  }
  function saveSkin() {
    $userPreferences.appearance.skin =
      selectedSkinIndex != undefined
        ? appConstants.themes[selectedSkinIndex]
        : $userPreferences.appearance.skin;
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
    appearance.modifyUserThemeSetting(selectedTheme);
  }
  function onTypefaceChange(e: CustomEvent) {
    const selectedTypeface = e.detail;
    $userPreferences.appearance.typeface = selectedTypeface;
  }

  //TODO - use change event on switchInput instead
  $: appearance.modifySyncWithSystem($appearance.isSyncWithSystem);
</script>

<ScrollView class="flex flex-col gap-8" bottomSpacerSize={Size.sm}>
  <!-- <Switcher
    label="Theme"
    {parentBackgroundIndex}
    items={appConstants.themes}
    selectionStyle={SelectionItemActiveStyle.CIRCLE_WITH_BACKGROUND}
    on:switch={onSkinChange}
    bind:selectedIndex={selectedSkinIndex}
  /> -->
  <TypefaceSelector
    label={{ label: "Font", orientation: Orientation.Vertical }}
    value={$userPreferences.appearance?.typeface || "Sen"}
    on:select={onTypefaceChange}
    size={Size.sm}
    {parentBackgroundIndex}
  />
  <SwitchInput
    bind:checked={$appearance.isSyncWithSystem}
    on:change={switchTheme}
    isExpanded={true}
    label={{
      label: "Sync theme with system",
      tooltip: {
        body: "Enable this to automatically switch between light and dark themes based on your system settings."
      }
    }}
  />
  {#if $userPreferences?.appearance?.skin === AppSkin.Clean && !$appearance.isSyncWithSystem}
    <OptionSelector
      labelProps={{ label: "Theme", orientation: Orientation.Vertical }}
      options={[
        { label: "Light", value: Theme.LIGHT },
        { label: "Dark", value: Theme.DARK }
      ]}
      size={Size.sm}
      on:select={switchTheme}
      bind:selected={selectedTheme}
    />
  {:else if $userPreferences?.appearance?.skin === AppSkin.Glassy}
    <div class="text-b3 text-fgs2">{`[ Experimental theme ]`}</div>
  {/if}
  {#if !$appearance.isSyncWithSystem}
    <ColorSchemeSelector
      theme={$appearance.userThemeSetting}
      selectedSchemeId={$appearance.colorScheme.id}
      on:select={saveColorScheme}
      size={Size.sm}
    />
  {:else}
    <div class="flex flex-col gap-8">
      <div>
        <ColorSchemeSelector
          label="Light color scheme"
          theme={Theme.LIGHT}
          size={Size.sm}
          selectedSchemeId={$appearance.lightColorSchemeId}
          on:select={saveColorScheme}
        />
      </div>
      <div>
        <ColorSchemeSelector
          label="Dark color scheme"
          theme={Theme.DARK}
          size={Size.sm}
          selectedSchemeId={$appearance.darkColorSchemeId}
          on:select={saveColorScheme}
        />
      </div>
    </div>
  {/if}
  <!-- {#if $appStore.isDebugMode}
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
  {/if} -->

  {#if $appearance.isSyncWithSystem}
    <InlineInfoBanner
      content="Dark and light themes will be switched automatically according to the system setting on your device."
      size={Size.sm}
    />
  {/if}

  {#if !$view.isConstrainedWidth}
    <SwitchInput
      bind:checked={$userPreferences.appearance.isBlurredBgForPopups}
      isExpanded={true}
      label={{
        label: "Blurred background for popups",
        tooltip: {
          body: "Enable this to blur the background of popups."
        }
      }}
    />
  {/if}
</ScrollView>
