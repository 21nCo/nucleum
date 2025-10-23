<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import EditModeToggle from "@21n/elements/toggle/EditModeToggle.svelte";
  import { appStore, isInEditMode } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import { Size } from "@21n/types/size.enum";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { onMount } from "svelte";
  import { analyticsConfigStore, selectedPageId } from "@21n/products/pointron/analytics/analytics.store";
  import AnalyticsPageView from "@21n/products/pointron/analytics/page/AnalyticsPageView.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import {
    onAddPageClicked,
    onPagelabelChange,
    onRemovePageClicked,
    onPageRearrange
  } from "@21n/products/pointron/analytics/analytics.utils";
  import { confirmationNotification } from "@21n/stores/notification.store";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import {
    uiState,
    uiStateDerived
  } from "@21n/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import { bg, cn } from "@21n/utils/ui.utils";
  import { Product } from "@21n/products/product.type";

  const bgIndex = 2;
  const isNucleusContext = $appStore.product === Product.NUCLEUS;
  $selectedPageId = resolvePageSelection();
  onMount(async () => {
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
      scope: UIStateScope.DEVICE
    });
  }

  function resolvePageSelection() {
    const pageState = uiState.getState(UIState.analyticsPage, {
      scope: UIStateScope.DEVICE
    });
    return pageState ?? $analyticsConfigStore.pages[0]?.id;
  }
</script>

<main class={cn("flex flex-col w-full h-full otop:pt-12", bg(bgIndex - 1))}>
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
              title={isNucleusContext ? "Focus analytics" : "Overview"}
              items={pages}
              style={PanelSwitcherStyle.BAR}
              isExpandToFullWidth={true}
              isEnableAnimationForTitle={false}
              isInEditMode={$isInEditMode}
              parentBgIndex={bgIndex}
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
</main>
