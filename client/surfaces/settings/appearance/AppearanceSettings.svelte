<script lang="ts">
  import {
    appConstants,
    appStore
  } from "@nucleum/shared-state/app-context/app.store";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import { onMount } from "svelte";
  import { AppSkin, Theme } from "@21n/theme/appearance.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import appearance from "@nucleum/shared-state/appearance/appearance.store";
  import { get } from "svelte/store";
  import SwitchInput from "@21n/ui/elements/toggle/SwitchInput.svelte";
  import InlineInfoBanner from "@21n/ui/elements/text/InlineInfoBanner.svelte";
  import ScrollView from "@21n/ui/compositions/scrollView/ScrollView.svelte";
  import OptionSelector from "@21n/ui/elements/select/OptionSelector.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import view from "@21n/ui/environment/view.store";
  import TypefaceSelector from "@nucleum/surfaces/settings/appearance/TypefaceSelector.svelte";
  import AppStyleSelector from "@nucleum/surfaces/settings/appearance/AppStyleSelector.svelte";
  import { resolveAppStyle } from "@21n/theme/app-style";
  import InterfaceSettings from "@nucleum/surfaces/settings/appearance/InterfaceSettings.svelte";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import {
    findColorSchemeFamily,
    findColorSchemeFamilyByPair,
    resolveColorSchemeFamilies
  } from "@21n/theme/colorscheme-catalog";
  import type { ColorScheme } from "@21n/theme/appearance.type";
  import ColorSchemeFamilyPicker from "@nucleum/surfaces/settings/appearance/ColorSchemeFamilyPicker.svelte";
  let { parentBackgroundIndex = 1 }: { parentBackgroundIndex?: number } =
    $props();
  void parentBackgroundIndex;
  onMount(() => {
    if ($userPreferences.appearance.skin !== AppSkin.Clean) {
      userPreferences.setAppearance({ skin: AppSkin.Clean });
    }
  });
  const schemeFamilies = resolveColorSchemeFamilies(
    (appConstants.colorSchemes ?? []) as ColorScheme[]
  );
  const currentFamily = $derived(
    findColorSchemeFamilyByPair(
      schemeFamilies,
      $appearance.lightColorSchemeId,
      $appearance.darkColorSchemeId
    )
  );
  let isMixedSchemes = $state(
    !findColorSchemeFamilyByPair(
      schemeFamilies,
      get(appearance).lightColorSchemeId,
      get(appearance).darkColorSchemeId
    )
  );
  function switchTheme(theme: Theme | undefined) {
    if (!theme) return;
    appearance.modifyUserThemeSetting(theme);
  }
  function onTypefaceChange(e: CustomEvent) {
    const selectedTypeface = e.detail;
    userPreferences.setAppearance({ typeface: selectedTypeface });
  }
</script>

<ScrollView class="flex flex-col gap-8" bottomSpacerSize={Size.sm}>
  <TypefaceSelector
    label={{ label: "Font", orientation: Orientation.Vertical }}
    value={$userPreferences.appearance.typeface || "Sen"}
    onSelect={onTypefaceChange}
    size={Size.sm}
    {parentBackgroundIndex}
  />
  <AppStyleSelector
    selected={resolveAppStyle($appearance.appStyle)}
    onSelect={(style) => appearance.setAppStyle(style)}
    size={Size.sm}
  />
  <SwitchInput
    checked={$appearance.isSyncWithSystem}
    onChange={(event) => {
      appearance.modifySyncWithSystem(event.detail);
    }}
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
      selected={$appearance.userThemeSetting}
      onSelect={(event) => {
        switchTheme(event.detail);
      }}
    />
  {:else if $userPreferences?.appearance?.skin === AppSkin.Glassy}
    <div class="text-b3 text-fgs2">{`[ Experimental theme ]`}</div>
  {/if}
  <div class="flex flex-col gap-4 w-full" data-testid="color-scheme-section">
    {#if !isMixedSchemes}
      <ColorSchemeFamilyPicker
        label="Colour scheme"
        families={schemeFamilies}
        selected={currentFamily}
        onSelect={(family) =>
          appearance.setColorSchemePair(family.lightId, family.darkId)}
      />
    {:else}
      <ColorSchemeFamilyPicker
        label="Light colour scheme"
        variant="light"
        testId="color-scheme-light-picker"
        families={schemeFamilies}
        selected={findColorSchemeFamily(
          schemeFamilies,
          $appearance.lightColorSchemeId
        )}
        onSelect={(family) =>
          appearance.setColorSchemePair(family.lightId, undefined)}
      />
      <ColorSchemeFamilyPicker
        label="Dark colour scheme"
        variant="dark"
        testId="color-scheme-dark-picker"
        families={schemeFamilies}
        selected={findColorSchemeFamily(
          schemeFamilies,
          $appearance.darkColorSchemeId
        )}
        onSelect={(family) =>
          appearance.setColorSchemePair(undefined, family.darkId)}
      />
    {/if}
    <div data-testid="toggle-mixed-color-schemes">
      <SwitchInput
        checked={isMixedSchemes}
        isExpanded={true}
        label={{
          label: "Use different light and dark schemes",
          tooltip: {
            body: "Pick the light and dark colour schemes separately instead of as one family."
          }
        }}
        onChange={(event) => {
          isMixedSchemes = event.detail;
          if (!event.detail && !currentFamily) {
            const family = findColorSchemeFamily(
              schemeFamilies,
              $appearance.lightColorSchemeId
            );
            if (family)
              appearance.setColorSchemePair(family.lightId, family.darkId);
          }
        }}
      />
    </div>
  </div>
  <!-- {#if $appStore.isDebugMode}
    <div>
      <Switcher
        label="Glassy theme trails"
        {parentBackgroundIndex}
        items={appConstants.tempColorSchemes}
        selectionStyle={SelectionItemActiveStyle.SIDEBAR}
        onSwitch={onTempSchemeChange}
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
      checked={$userPreferences.appearance.isBlurredBgForPopups}
      onChange={(event) => {
        userPreferences.setAppearance({
          isBlurredBgForPopups: event.detail
        });
      }}
      isExpanded={true}
      label={{
        label: "Blurred background for popups",
        tooltip: {
          body: "Enable this to blur the background of popups."
        }
      }}
    />
  {/if}
  {#if $context.embed !== Embed.HANDSET}
    <InterfaceSettings />
  {/if}
</ScrollView>
