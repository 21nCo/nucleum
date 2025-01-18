<script lang="ts">
  import { appConstants } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { onMount } from "svelte";
  import { AppSkin, Theme } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import appearance from "$lib/client/stores/appearance.store";
  import ColorSchemeSelector from "$lib/client/components/settings/appearance/ColorSchemeSelector.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import ScrollView from "$lib/client/layout/scrollView/ScrollView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let parentBackgroundIndex: number = 1;
  let selectedSkinIndex: number = 0;
  let selectedTheme: Theme;
  let selectedTempSchemeIndex: number = 0;
  onMount(() => {
    selectedSkinIndex = appConstants.themes.findIndex(
      (x) => x == $appearance.skin
    );
    selectedTheme = $appearance.userThemeSetting;
    $appearance.skin = AppSkin.Clean;
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
    appearance.modifyUserThemeSetting(selectedTheme);
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
  {#if $appearance.skin === AppSkin.Clean && !$appearance.isSyncWithSystem}
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
  {:else if $appearance.skin === AppSkin.Glassy}
    <div class="text-b3 text-fgs2">{`[ Experimental theme ]`}</div>
  {/if}
  {#if !$appearance.isSyncWithSystem}
    <ColorSchemeSelector
      theme={$appearance.userThemeSetting}
      selectedSchemeId={$appearance.colorScheme.id}
      on:select={saveColorScheme}
    />
  {:else}
    <div class="flex flex-col gap-8">
      <div>
        <ColorSchemeSelector
          label="Light color scheme"
          theme={Theme.LIGHT}
          selectedSchemeId={$appearance.lightColorSchemeId}
          on:select={saveColorScheme}
        />
      </div>
      <div>
        <ColorSchemeSelector
          label="Dark color scheme"
          theme={Theme.DARK}
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
      content="Dark and light themes will be switched automatically according to the system
setting on your device."
    />
  {/if}
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
  <SwitchInput
    checked={$appearance.isFixedLeftNav}
    isExpanded={true}
    on:change={(e) => appearance.setLeftNavFixed(e.detail)}
    label={{
      label: "Fixed app menu bar",
      tooltip: {
        body: "Enable this to fix the app menu bar to the left side of the screen. This defaults the app menu bar to collapsed state, removes expand button and adds labels to the app menu items."
      }
    }}
  />
</ScrollView>
