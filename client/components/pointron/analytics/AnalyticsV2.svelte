<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import EditModeToggle from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { dataManager } from "$lib/client/stores/data.store";
  import view from "$lib/client/stores/view.store";
  import { Item } from "$lib/client/types/item.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { onMount } from "svelte";
  import { analyticsConfigStore } from "./analytics.store";
  import AnalyticsPageView from "./page/AnalyticsPageView.svelte";
  import PageLoadingAnimation from "$lib/client/elements/feedback/animations/PageLoadingAnimation.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  let refreshId = new Date().getTime();
  let selectedPageId = $analyticsConfigStore.pages[0]?.id;
  onMount(async () => {
    await dataManager.refresh(Item.pointAnalyticsConfig);
    refreshId = new Date().getTime();
  });
  function onadd() {
    analyticsConfigStore.addPage();
    refreshId = new Date().getTime();
  }
  function onremove(e: CustomEvent<string>) {
    analyticsConfigStore.removePage(e.detail);
    refreshId = new Date().getTime();
  }
  function onselect(e: CustomEvent<string>) {
    console.log("select", e.detail);
    selectedPageId =
      $analyticsConfigStore.pages.find((page) => page.id === e.detail)?.id ??
      selectedPageId;
    refreshId = new Date().getTime();
    console.log({
      selectedPageId,
      pages,
      analyticsConfigStore: $analyticsConfigStore
    });
  }
  function onpagelabelchange(e: CustomEvent<{ value: string; label: string }>) {
    if (!e.detail.label || !e.detail.value) return;
    analyticsConfigStore.editPageLabel(e.detail.value, e.detail.label);
  }
  $: pages =
    $analyticsConfigStore.pages.length > 0
      ? $analyticsConfigStore.pages?.map((page) => {
          return { label: page.label, value: page.id };
        })
      : [];
</script>

<div class="flex flex-col w-full h-full">
  <div
    class="flex gap-8 w-full items-center justify-between {$view.isPortrait
      ? 'px-4 py-2'
      : 'px-4 pt-4 pb-2'}"
  >
    <div class="flex gap-6 items-center grow">
      <Text style={TextStyle.PAGE_HEADING_SUBTLE} content="Analytics" />
      {#if $view.isPortrait}
        <DropDown
          items={pages}
          value={selectedPageId}
          isDisableSearch={true}
          on:select={onselect}
        />
      {:else}
        <PanelSwitcher
          items={pages}
          style={PanelSwitcherStyle.TRAIN}
          size={Size.sm}
          isInEditMode={$isInEditMode}
          on:switch={onselect}
          on:add={onadd}
          on:remove={onremove}
          on:change={onpagelabelchange}
        />
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if $isInEditMode && !$view.isPortrait}
        <Button
          icon="sync"
          label="reset"
          size={Size.xs}
          on:click={analyticsConfigStore.reset}
        />
      {/if}
      <EditModeToggle />
    </div>
  </div>
  {#key refreshId}
    {#if selectedPageId}
      <AnalyticsPageView id={selectedPageId} />
    {:else}
      <PageLoadingAnimation variant="page" />
    {/if}
  {/key}
</div>
