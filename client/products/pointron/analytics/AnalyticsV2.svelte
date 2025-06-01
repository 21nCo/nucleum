<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import EditModeToggle from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { onMount } from "svelte";
  import { analyticsConfigStore, selectedPageId } from "./analytics.store";
  import AnalyticsPageView from "./page/AnalyticsPageView.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import {
    onAddPageClicked,
    onPagelabelChange,
    onRemovePageClicked,
    onPageRearrange
  } from "./analytics.utils";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { postToParent } from "$lib/client/utils/embed.utils";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import {
    uiState,
    uiStateDerived
  } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { bg, cn } from "$lib/client/utils/ui.utils";

  const bgIndex = 2;
  $selectedPageId = resolvePageSelection();
  onMount(async () => {
    if ($context.embed == Embed.HANDSET) {
      postToParent({ bg: 2 });
    }
    if (!$selectedPageId) {
      $selectedPageId = $analyticsConfigStore.pages[0]?.id;
    }
  });
  $: pages =
    $analyticsConfigStore.pages.length > 0
      ? $analyticsConfigStore.pages?.map((page) => {
          return { label: page.label, value: page.id };
        })
      : [];

  function onPageSwitch(e: CustomEvent<string>) {
    uiState.setState(UIState.analyticsPage, e.detail, {
      isProductScoped: true,
      isDeviceScoped: true
    });
  }

  function resolvePageSelection() {
    const pageState = uiState.getState(UIState.analyticsPage, {
      isProductScoped: true,
      isDeviceScoped: true
    });
    return pageState ?? $analyticsConfigStore.pages[0]?.id;
  }
</script>

<div class={cn("flex flex-col w-full h-full", bg(bgIndex - 1))}>
  <div
    class="flex gap-8 w-full items-center justify-between portrait:px-4 portrait:py-2 portrait:pt-4 portrait:pb-2"
  >
    <div class="flex gap-6 items-center flex-grow">
      {#if $view.isPortrait}
        <div class="flex flex-col gap-3 w-full">
          <div class="flex justify-between w-full">
            <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Overview" />
            <EditModeToggle />
          </div>
          <div class="flex w-full gap-2 items-center">
            <div class="overflow-x-auto">
              <OptionSelector
                options={pages}
                size={Size.sm}
                isPreventWrap={true}
                bind:selected={$selectedPageId}
              />
            </div>
            {#if $isInEditMode}
              <Button
                class="min-w-fit"
                size={Size.xs}
                parentBgIndex={bgIndex}
                icon="pencil-square"
                style={ButtonStyle.OUTLINED}
                on:click={() =>
                  appStore.runAction(
                    PointronAction.ANALYTICS_VIEWS_PAGE_EDIT_MOBILE
                  )}
              >
                edit</Button
              >{/if}
          </div>
        </div>
      {:else}
        <div class="flex overflow-hidden w-full">
          <div class="overflow-x-auto w-full">
            <PanelSwitcher
              title="Overview"
              items={pages}
              style={PanelSwitcherStyle.BAR}
              isExpandToFullWidth={true}
              isEnableAnimationForTitle={false}
              isInEditMode={$isInEditMode}
              parentBgIndex={bgIndex}
              isShowNumberShortcut={$uiStateDerived.isShowHotKeyHints}
              isEnableTitleAction={true}
              tempTitleWithActionDisabled={true}
              bind:value={$selectedPageId}
              on:switch={onPageSwitch}
              on:add={onAddPageClicked}
              on:remove={onRemovePageClicked}
              on:debouncedChange={onPagelabelChange}
              on:rearrange={onPageRearrange}
            >
              <div class="flex items-center gap-2 mr-3" slot="right">
                {#if $isInEditMode}
                  <Button
                    icon="sync"
                    label="reset"
                    isPreventMinWidth={true}
                    size={Size.xs}
                    on:click={() => {
                      confirmationNotification.notify({
                        title: "Reset analytics",
                        message:
                          "Are you sure you want to reset analytics? This will remove all pages and cards.",
                        confirmAction: {
                          label: "Reset",
                          variant: ButtonVariant.DANGER,
                          callback: async () => {
                            await analyticsConfigStore.reset();
                            return true;
                          }
                        }
                      });
                    }}
                  />
                {/if}
                <EditModeToggle />
              </div>
            </PanelSwitcher>
          </div>
        </div>
      {/if}
    </div>
  </div>
  {#key $selectedPageId}
    {#if $selectedPageId}
      <AnalyticsPageView id={$selectedPageId} parentBgIndex={bgIndex} />
    {:else}
      <EmptyStatusView
        subText="Please click on a view to see Analytic cards or click on edit to manage views"
      />
    {/if}
  {/key}
</div>
