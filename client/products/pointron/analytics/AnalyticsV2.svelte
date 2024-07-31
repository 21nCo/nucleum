<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import EditModeToggle from "$lib/client/elements/toggle/EditModeToggle.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import view from "$lib/client/stores/view.store";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { onMount } from "svelte";
  import { analyticsConfigStore } from "./analytics.store";
  import AnalyticsPageView from "./page/AnalyticsPageView.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  let refreshId = new Date().getTime();
  let selectedPageId = $analyticsConfigStore.pages[0]?.id;
  onMount(async () => {
    await dataManager.refresh(Resource.pointAnalyticsConfig);
    refreshId = new Date().getTime();
    if (!selectedPageId) {
      selectedPageId = $analyticsConfigStore.pages[0]?.id;
    }
  });
  function onAddPageClicked() {
    analyticsConfigStore.addPage();
    refreshId = new Date().getTime();
  }
  function onRemovePageClicked(e: CustomEvent<string>) {
    analyticsConfigStore.removePage(e.detail);
    refreshId = new Date().getTime();
  }
  function onPageSwitch(e: CustomEvent<string>) {
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
  function onPagelabelChange(e: CustomEvent<{ value: string; label: string }>) {
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
          <div class="w-full overflow-x-auto">
            <OptionSelector
              options={pages}
              size={Size.sm}
              isPreventWrap={true}
              on:select={onPageSwitch}
            />
          </div>
        </div>
      {:else}
        <PanelSwitcher
          title="Analytics"
          items={pages}
          style={PanelSwitcherStyle.SNAKE}
          isExpandToFullWidth={true}
          isEnableAnimationForTitle={false}
          isInEditMode={$isInEditMode}
          on:switch={onPageSwitch}
          on:add={onAddPageClicked}
          on:remove={onRemovePageClicked}
          on:change={onPagelabelChange}
        >
          <div class="flex items-center gap-2" slot="right">
            {#if $isInEditMode}
              <Button
                icon="sync"
                label="reset"
                size={Size.xs}
                on:click={analyticsConfigStore.reset}
              />
            {/if}
            <EditModeToggle />
          </div>
        </PanelSwitcher>
      {/if}
    </div>
  </div>
  {#key refreshId}
    {#if selectedPageId}
      <AnalyticsPageView id={selectedPageId} />
    {:else}
      <EmptyStatusView
        subText="Please click on a view to see Analytic cards or click on edit to manage views"
      />
    {/if}
  {/key}
</div>
