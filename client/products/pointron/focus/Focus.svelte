<script lang="ts">
  import { page } from "$app/stores";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { onMount } from "svelte";
  import QuickStart from "./quickstart/QuickStart.svelte";
  import Advanced from "./advanced/Advanced.svelte";
  import view from "$lib/client/stores/view.store";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Zen from "./zen/Zen.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import FloatingButton from "$lib/client/elements/button/FloatingButton.svelte";
  import AdvancedPortrait from "./advanced/AdvancedPortrait.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import PageLayer from "$lib/client/layout/layers/PageLayer.svelte";
  import QuickStartActions from "./quickstart/actions/QuickStartActions.svelte";
  import { manualLogStore } from "../logs/log.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  let mode: number = 0;
  let isInlineEnabled: boolean = true;
  let addManualLogButton: IButtonParams = {
    label: "Add manual log",
    callback: onManualLogClicked,
    icon: "clock",
    variant: ButtonVariant.PRIMARY,
    parentBgIndex: $view.isPortrait ? 1 : 3,
    style: $view.isPortrait ? ButtonStyle.DEFAULT : ButtonStyle.OUTLINED
  };
  let startSessionButton: IButtonParams = {
    label: "Start session",
    callback: onStartSessionClicked,
    icon: "play",
    variant: ButtonVariant.PRIMARY,
    style: ButtonStyle.DEFAULT
  };
  /**
   * Refresh the page data
   *
   * Note: Setting a delay to ensure that dataManager loads session, focus items data before performing check and triggering loadEmptyState.
   */
  onMount(async () => {
    await refresh();
    setTimeout(() => {
      if ($sessionStore.isSessionRunning) {
        if ($sessionStore.isQuickStartOn) {
          mode = 0;
        } else {
          mode = 1;
        }
      } else if (
        !$sessionStore.isSessionRunning &&
        $sessionStore.state != SessionState.FINISHED
      ) {
        sessionStore.loadEmptyState();
      }
    }, 1000);
    let queryParamMode = $page.url.searchParams.get("mode");
    if (queryParamMode) {
      mode = +queryParamMode;
    }
  });
  async function onManualLogClicked() {
    manualLogStore.reset();
    appStore.runAction(PointronAction.MANUAL_FOCUS_ENTRY_POP);
  }
  async function onStartSessionClicked() {
    await sessionStore.startSession();
  }
  async function refresh() {
    await dataManager.refreshPage([
      Resource.quickFocusItems,
      Resource.PointTag
    ]);
  }
</script>

{#if $view.isPortrait}
  <div class="relative flex w-full h-full">
    <div class="flex flex-col h-full w-full">
      {#if $sessionStore.isSessionRunning && !$sessionStore.isQuickStartOn && isInlineEnabled}
        <Zen isInline={true} />
      {:else}
        <div
          class="flex flex-col gap-3 w-full h-full items-center {$view.isPortrait
            ? 'px-4 py-2'
            : 'p-6'}"
        >
          <div class="flex w-full gap-8 items-center justify-center">
            <PanelSwitcher
              size={Size.lg}
              items={["Quick Focus", "Advanced"]}
              value={mode === 0 ? "Quick Focus" : "Advanced"}
              style={PanelSwitcherStyle.BAR}
              barStyle={BarStyle.DOT}
              isDisableEnabled={$sessionStore.isSessionRunning}
              on:switch={(e) => {
                mode = e.detail === "Quick Focus" ? 0 : 1;
              }}
            />
            <!-- <TopBarActions /> -->
            <!-- {#if mode === 0}
              <QuickStartActions context="topright" />
            {/if} -->
          </div>
          {#if mode === 0}
            <div class="flex-grow w-full">
              <QuickStart />
            </div>
            <FloatingButton params={addManualLogButton} />
            <!-- <ManualFocusLog /> -->
          {:else}
            <AdvancedPortrait />
            <FloatingButton params={startSessionButton} />
          {/if}
        </div>
      {/if}
    </div>
    <!-- {#if mode === 0}
      <FloatingButton params={addManualLogButton} />
    {/if} -->
  </div>
{:else}
  <div class="flex w-full h-full">
    {#if $sessionStore.isSessionRunning && !$sessionStore.isQuickStartOn}
      <Zen isInline={true} />
    {:else}
      <Panel
        title="Quick Focus"
        floatingButton={addManualLogButton}
        titleStyle={TextStyle.PANEL_HEADING}
      >
        <QuickStart />
        <slot:fragment slot="toprightactions">
          <span>
            <QuickStartActions context="topright" />
          </span>
        </slot:fragment>
        <slot name="right" slot="right">
          {#if $sessionStore.isSessionRunning}
            <Zen isInline={true} />
          {:else}
            <Advanced />
            <FloatingButton params={startSessionButton} />
          {/if}
        </slot>
      </Panel>
    {/if}
  </div>
{/if}
<PageLayer on:appear={refresh} />
