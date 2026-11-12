<svelte:options runes={true} />

<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import Text from "@21n/ui/elements/text/Text.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import SettingThumbnail from "@nucleum/surfaces/settings/SettingThumbnail.svelte";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

  import ProfileCpSection from "@nucleum/surfaces/account/profile/ProfileCPSection.svelte";
  import SettingsFooter from "@nucleum/surfaces/settings/SettingsFooter.svelte";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import { Action } from "@nucleum/client/config/action.enum";
  import { page } from "$app/stores";
  import { requireSurfaceProductConfig } from "@nucleum/shared-state/product/surface-config-host";
  import BackButton from "@nucleum/shell/navigation/components/BackButton.svelte";
  import modalEvent from "@nucleum/shell/overlays/modal.store";
  import view from "@21n/ui/environment/view.store";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  let {
    isModal = false
  }: {
    /** Whether Settings is hosted in a modal rather than rendered as a page. */
    isModal?: boolean;
  } = $props();
  const ComponentResolver = requireActionRenderer();
  let selected: string = $state("");
  let parentBgIndex: number = 2;
  // resolveAction("theme");
  let pageAction: IAction | null = $state(null);
  const backPath = $derived(
    $page.url.searchParams.get(AppSearchParam.RETURN_TO)
  );
  const config = requireSurfaceProductConfig().settings;
  const settingSearchParam = $derived(
    $page.url.searchParams.get(AppSearchParam.SETTING)
  );
  $effect(() => {
    if (settingSearchParam) runAction(settingSearchParam);
  });
  const layerParams = [
    AccessMode.OVERLAY,
    AccessMode.PANEL,
    AccessMode.PAGE,
    AccessMode.BESIDE_PAGE,
    "full"
  ];
  /** Whether a path or a shell layer value names the Settings route. */
  function isSettingsTarget(value: string) {
    const settingsPath = `/${Action.SETTINGS}`;
    const head = `/${value.toLowerCase().replace(/^\/+/, "")}`.split(
      /[:?#]/
    )[0];
    return head === settingsPath || head.startsWith(`${settingsPath}/`);
  }
  /**
   * The automatic handoff only follows a return path that stays inside the
   * app: a single-slash relative path on this origin that neither is Settings
   * nor opens it in a shell layer (overlay, panel, page, beside page or the
   * legacy full param). Anything else (an external or protocol-relative URL,
   * a scheme, or a Settings target) falls back to the product home.
   */
  function appReturnPath(path: string | null) {
    if (!path?.startsWith("/") || path.startsWith("//")) return null;
    const base = "https://return-to.invalid";
    try {
      const url = new URL(path, base);
      if (url.origin !== base) return null;
      if (isSettingsTarget(decodeURIComponent(url.pathname))) return null;
      const layers = layerParams.flatMap((param) =>
        url.searchParams.getAll(param)
      );
      if (layers.some(isSettingsTarget)) return null;
    } catch {
      return null;
    }
    return path;
  }
  /**
   * Appearance previews live in its own right-side modal on wide screens, so
   * selecting it closes Settings and opens that modal instead of rendering it
   * inside Settings. Settings hosted in a modal is hidden; Settings rendered as
   * the page (portrait) is replaced by its in-app return path, else the
   * product's home, so the app shows beside the drawer and Back does not reopen
   * Settings. Returns whether it handed off.
   */
  function openInRightModal(slug: string) {
    if (slug !== Action.APPEARANCE_SETTINGS || $view.isConstrainedWidth)
      return false;
    if (isModal) {
      if (settingSearchParam)
        navigation.toggleSearchParam([AppSearchParam.SETTING]);
      modalEvent.hide(Action.SETTINGS, "SettingsAsModal");
    } else {
      const product = requireProductConfig();
      const home = $view.isPortrait ? product.homePathPt : product.homePath;
      navigation.gotoPath(appReturnPath(backPath) ?? `/${home}`, {
        replaceState: true
      });
    }
    requireCommandHost().runAction(Action.APPEARANCE_SETTINGS);
    return true;
  }
  async function runAction(slug: string) {
    if (!slug) {
      pageAction = null;
      return;
    }
    if (openInRightModal(slug)) return;
    selected = slug;
    const action = requireCommandHost().resolveAction(slug);
    if (action?.component) {
      pageAction = action;
      return;
    }
    pageAction = null;
    requireCommandHost().runAction(slug);
  }
</script>

<div class="flex w-full h-full">
  <div
    data-testid="settings-sidebar"
    class="flex flex-col overflow-auto gap-8 w-72 min-w-72 dp:w-[21rem] dp:min-w-[21rem] shrink-0 bg-bgs2 rounded-l-md py-4 items-start otop:pt-12"
  >
    <div class="pl-4">
      <BackButton
        isEnabled={backPath !== null}
        {parentBgIndex}
        isPreventDefault={true}
        onclick={() => {
          if (backPath) navigation.gotoPath(backPath);
        }}
      >
        <Text
          content="Settings"
          style={backPath ? TextStyle.PANEL_HEADING : TextStyle.PAGE_HEADING}
        />
      </BackButton>
    </div>
    <div class="flex flex-col overflow-auto gap-8 w-full">
      <ProfileCpSection
        context="modal"
        parentBackgroundIndex={2}
        onclick={() => {
          navigation.toggleSearchParam({
            [AppSearchParam.SETTING]: Action.ACCOUNT
          });
        }}
      />
      {#if config}
        <div class=" flex flex-col w-full gap-8">
          {#each config as section}
            <div class="flex flex-col w-full gap-2 items-start">
              {#if !section.isHideTitle}
                <div class="pl-4">
                  <Text
                    content={section.section}
                    style={TextStyle.SECTION_HEADING}
                  />
                </div>
                <!-- <div class="text-fgs3 text-b2 font-medium pl-4">
                {section.section}
              </div> -->
              {/if}
              <div class="flex flex-col w-full">
                {#if section.children}
                  {#each section.children as item}
                    <SettingThumbnail
                      parentBackgroundIndex={2}
                      orientation={Orientation.Horizontal}
                      action={item}
                      isActive={selected === item}
                      width="w-40"
                      onclick={() => {
                        if (openInRightModal(item)) return;
                        selected = item;
                        const action = requireCommandHost().resolveAction(item);
                        if (action?.component) pageAction = action;
                        navigation.toggleSearchParam({
                          [AppSearchParam.SETTING]: item
                        });
                      }}
                    />
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
          <SettingsFooter {parentBgIndex} />
        </div>
      {/if}
    </div>
  </div>
  <div class="flex flex-col items-start flex-grow h-full p-4 otop:pt-12">
    {#if pageAction}
      <div class="flex justify-start h-10">
        <Text
          content={pageAction.label ?? ""}
          style={TextStyle.PANEL_HEADING}
          isPreventProperCasing={true}
        />
      </div>
      <div class="flex w-full justify-start items-start flex-grow">
        <ComponentResolver action={pageAction} />
      </div>
    {:else}
      <EmptyStatusView subText="Please select a setting to view it here" />
    {/if}
  </div>
</div>
