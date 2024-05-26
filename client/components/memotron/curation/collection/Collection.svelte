<script lang="ts">
  import {
    CurationType,
    type ICollectionView
  } from "$lib/client/types/memotron/curation.type";
  import { resolveActiveCurationStore } from "../curation.store";
  import Cover from "./Cover.svelte";
  import CollectionTitleBar from "./CollectionTitleBar.svelte";
  import View from "./View.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import ViewSettingsBar from "./ViewSettingsBar.svelte";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import { metaPropertyOptions, propertyOptions } from "../../type/type.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import view from "$lib/client/stores/view.store";
  import ViewTabSwitcher from "./ViewTabSwitcher.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";

  export let id: string;
  let activeView: ICollectionView | null = null;
  let selectedViewId: string;
  let selectedTab: string;
  $: collection = resolveActiveCurationStore(id);
  $: console.log("CollectionView", $collection);
  $: properties = resolvePropertyList($collection?.associatedType);
  //temp default view - use selectedView
  $: activeView =
    $collection && "views" in $collection ? $collection.views?.[0] : null;
  //TEMP - for testing tabs
  $: if (!activeView?.tabBy && activeView)
    activeView.tabBy = "property:lw6ag4w7k13qquvhv221blzl";
  $: console.log("activeView", activeView);
  function resolvePropertyList(type: any) {
    //TODO -  map type.properties to dropdown items - mapping corresponding icons from propertyOptions
    const noneOption = {
      label: "None",
      value: "none",
      icon: "none"
    };
    return type
      ? [noneOption, ...(type?.properties ?? []), ...metaPropertyOptions]
      : [noneOption, ...metaPropertyOptions];
  }
</script>

{#if $collection}
  <div class="flex flex-col w-full h-full">
    {#if $collection.type != CurationType.NODELINKS && "cover" in $collection}
      <Cover bind:src={$collection.cover} />
    {/if}
    <div
      class={cn("flex flex-col gap-6 flex-grow w-full", {
        "p-3": $view.isPortrait,
        "p-6": !$view.isPortrait
      })}
    >
      <header class="flex flex-col gap-8 w-full">
        <CollectionTitleBar on:back {id} />
        <!-- TODO - view switcher -->
        <PanelSwitcher
          items={["view 1", "view 2", "view 3"]}
          style={PanelSwitcherStyle.BAR}
          isExpandToFullWidth={true}
        />
        {#if activeView}
          {#if $isInEditMode}
            <ViewSettingsBar view={activeView} {properties} />
          {/if}
          {#if activeView.tabBy}
            <ViewTabSwitcher
              view={activeView}
              bind:value={selectedTab}
              properties={$collection?.associatedType?.properties}
            />
          {/if}
        {/if}
      </header>
      <main class="w-full flex-grow flex justify-center items-center">
        {#if $collection.isRefreshing}
          <PageLoadingPulse />
        {:else if !$collection.isRefreshing && activeView}
          <View view={activeView} />
        {:else}
          content
        {/if}
      </main>
    </div>
  </div>
{/if}
