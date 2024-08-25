<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import EditModeToggle from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import view from "$lib/client/stores/view.store";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
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
    onPageSwitch,
    onPagelabelChange,
    onRemovePageClicked
  } from "./analytics.utils";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { postToParent } from "$lib/client/utils/embed.utils";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { uiStateDerived } from "$lib/client/stores/uiState/uiState.store";
  import { isTextElement } from "$lib/client/utils/browser.utils";

  $selectedPageId = $analyticsConfigStore.pages[0]?.id;
  onMount(async () => {
    if ($context.embed == Embed.HANDSET) {
      postToParent({ bg: 2 });
    }
    await dataManager.refresh(Resource.pointAnalyticsConfig);
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
</script>

<div class="flex flex-col w-full h-full mo:bg-bgs2">
  <div
    class="flex gap-8 w-full items-center justify-between px-4 portrait:py-2 pt-4 pb-2"
  >
    <div class="flex gap-6 items-center flex-grow">
      {#if $view.isPortrait}
        <div class="flex flex-col gap-3 w-full">
          <div class="flex justify-between w-full">
            <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Analytics" />
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
                parentBgIndex={2}
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
              title="Analytics"
              items={pages}
              style={PanelSwitcherStyle.SNAKE}
              isExpandToFullWidth={true}
              isEnableAnimationForTitle={false}
              isInEditMode={$isInEditMode}
              isShowNumberShortcut={$uiStateDerived.isShowHotKeyHints}
              bind:value={$selectedPageId}
              on:add={onAddPageClicked}
              on:remove={onRemovePageClicked}
              on:change={onPagelabelChange}
            />
          </div>
          <div class="flex items-center gap-2 ml-auto">
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
        </div>
      {/if}
    </div>
  </div>
  {#key $selectedPageId}
    {#if $selectedPageId}
      <AnalyticsPageView id={$selectedPageId} />
    {:else}
      <EmptyStatusView
        subText="Please click on a view to see Analytic cards or click on edit to manage views"
      />
    {/if}
  {/key}
</div>

<svelte:document
  on:keydown={(event) => {
    let index;
    const isTextInputSource = isTextElement(event.target);
    if (isTextInputSource) return;
    if (event.code.includes("Digit")) index = +event.key;
    if (!index) return;
    selectedPageId.set($analyticsConfigStore.pages[index - 1]?.id ?? "");
  }}
/>
