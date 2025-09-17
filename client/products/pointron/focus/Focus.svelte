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
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
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
  import { appStore } from "$lib/client/stores/app.store";
  import QuickStartLayoutToggle from "./quickstart/actions/QuickStartLayoutToggle.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import ComponentShortcutListener from "$lib/client/components/shortcuts/ComponentShortcutListener.svelte";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  export let accessMode: ResourceAccessMode = ResourceAccessMode.INLINE;
  let mode: number = 0;
  let isInlineEnabled: boolean = true;
  const manualLogHotKey = {
    key: "m"
  };
  const focusToggleHotKey = {
    key: "f"
  };
  let addManualLogButton: IButtonParams = {
    label: "Add manual log",
    callback: onManualLogClicked,
    icon: "clock",
    variant: ButtonVariant.PRIMARY,
    parentBgIndex: $view.isPortrait ? 1 : 3,
    shortcut: manualLogHotKey,
    style: $view.isPortrait ? ButtonStyle.DEFAULT : ButtonStyle.OUTLINED
  };
  let startSessionButton: IButtonParams = {
    label: "Start focus",
    callback: onStartSessionClicked,
    icon: "play",
    variant: ButtonVariant.PRIMARY,
    style: ButtonStyle.DEFAULT,
    shortcut: PointronAction.TOGGLE_FOCUS_SESSION
  };

  onMount(async () => {
    let queryParamMode = $page.url.searchParams.get(AppSearchParam.MODE);
    if (queryParamMode) {
      mode = +queryParamMode;
    }
  });
  async function onManualLogClicked() {
    appStore.runAction(PointronAction.MANUAL_FOCUS_ENTRY);
  }
  async function onStartSessionClicked() {
    await activeSession.startSession();
  }
</script>

{#if $view.isPortrait}
  <main class="relative flex w-full h-full otop:pt-12">
    <div class="flex flex-col h-full w-full">
      {#if $activeSession.isSessionRunning && !$activeSession.isQuickStartOn && isInlineEnabled}
        <Zen isInline={true} />
      {:else}
        <div
          class={cn("flex flex-col gap-3 w-full h-full items-center", {
            "py-2": $view.isPortrait,
            "px-4": $view.isPortrait && mode !== 0,
            "p-6": !$view.isPortrait
          })}
        >
          <div class="flex w-full gap-8 items-center justify-center">
            <PanelSwitcher
              size={Size.lg}
              items={["Quick Focus", "Advanced"]}
              value={mode === 0 ? "Quick Focus" : "Advanced"}
              style={PanelSwitcherStyle.BAR}
              barStyle={BarStyle.DOT}
              isDisableEnabled={$activeSession.isSessionRunning}
              on:switch={(e) => {
                mode = e.detail === "Quick Focus" ? 0 : 1;
              }}
            />
            <!-- {#if mode === 0}
              <QuickStartActions context="topright" />
            {/if} -->
          </div>
          {#if mode === 0}
            <QuickStart />
            <FloatingButton params={[addManualLogButton]} />
            <!-- <ManualFocusLog /> -->
          {:else}
            <AdvancedPortrait />
            <FloatingButton params={[startSessionButton]} />
          {/if}
        </div>
      {/if}
    </div>
    <!-- {#if mode === 0}
      <FloatingButton params={addManualLogButton} />
    {/if} -->
  </main>
{:else}
  <div class="flex w-full h-full">
    {#if $activeSession.isSessionRunning && !$activeSession.isQuickStartOn}
      <Zen isInline={true} />
    {:else}
      <Panel
        title="Quick Focus"
        info={{
          body: "Tap on a goal to start a focus session."
        }}
        floatingButton={addManualLogButton}
        titleStyle={TextStyle.PANEL_HEADING}
        isProminentDivider={true}
        extraLargeScreenComponent={$activeSession.isSessionRunning ||
        accessMode === ResourceAccessMode.POP
          ? undefined
          : "simpleDigitalClock"}
      >
        <slot name="nonpadded" slot="nonpadded">
          <QuickStart />
        </slot>
        <slot:fragment slot="toprightactions">
          <span>
            <QuickStartLayoutToggle />
          </span>
        </slot:fragment>
        <slot name="right" slot="right">
          {#if $activeSession.isSessionRunning}
            <Zen isInline={true} />
          {:else}
            <Advanced />
            <FloatingButton params={[startSessionButton]} />
          {/if}
        </slot>
      </Panel>
    {/if}
  </div>
{/if}
<ComponentShortcutListener
  shortcuts={[
    {
      shortcut: manualLogHotKey,
      callback: onManualLogClicked
    },
    {
      shortcut: focusToggleHotKey,
      callback: () => {
        appStore.runAction(PointronAction.TOGGLE_FOCUS_SESSION);
      }
    }
  ]}
/>
