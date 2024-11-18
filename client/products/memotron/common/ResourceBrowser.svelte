<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Arrangement, Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { collectionStore } from "../collection/collection.store";
  import { InputStyle } from "$lib/client/types/input.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Resources from "./Resources.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { page } from "$app/stores";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType,
    ResourceAccessMode,
    ResourceAccessPointState
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import BulkEditBar from "./BulkEditBar.svelte";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import { BulkEditor, SearchStore } from "../memotron.store";
  import { onMount } from "svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  export let resource: Resource;

  let searchQuery: string = "";
  let isRefineShown = false;
  let id: string | null = null;
  let searchStore = new SearchStore(resource);
  let arrangement: Arrangement = uiState.getResourceState(
    resource,
    ResourceAccessPoint.BROWSER,
    UIState.arrangement
  );
  $: id = $page.url.searchParams.get(ResourceAccessMode.INLINE);
  $: multiSelectContext = {
    resource,
    accessPoint: ResourceAccessPoint.BROWSER
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  $: floatingButton =
    $multiSelectStore.length > 0
      ? undefined
      : {
          label: "Create " + resource,
          callback: async () =>
            appStore.runAction(
              resourceAction(resource, ResourceActionType.CREATE)
            ),
          icon: "plus",
          variant: ButtonVariant.PRIMARY
        };

  $: state = isValidString(searchQuery)
    ? ResourceAccessPointState.SEARCH
    : ResourceAccessPointState.DEFAULT;

  let data: any[] = [];
  let starred: any[] = [];
  onMount(async () => {
    await refresh();
  });
  function onSelectAll() {
    $multiSelectStore = data.map((x) => x.id);
  }
  async function onBulkAction(e: CustomEvent<string>) {
    try {
      const editor = new BulkEditor(resource, multiSelectStore);
      const result = await editor.run(e.detail);
      if (result) {
        await refresh();
      }
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }
  async function refresh() {
    data = await searchStore.select({
      searchQuery,
      limit: 150
    });
    starred = await searchStore.starred();
  }
</script>

<Panel {floatingButton}>
  <div
    class="relative flex flex-col gap-4 h-full overflow-auto"
    slot="nonpadded"
  >
    <header class="flex gap-1 items-center py-4 px-5 border-b border-brs2">
      <!-- TODO - use InlineSearchBar -->
      <TextInput
        bind:value={searchQuery}
        size={Size.lg}
        style={InputStyle.PLAIN}
        on:keyup={refresh}
        placeholder={"Search " + resource + "s"}
      />
      {#if searchQuery}
        <Button
          icon="cross"
          tooltip="Clear query"
          size={Size.sm}
          on:click={() => {
            searchQuery = "";
            refresh();
          }}
        />
        <!-- {:else}
            <Button icon="adjustments-vertical" size={Size.sm} /> -->
      {/if}
      <Button
        icon="adjustments-vertical"
        tooltip="Settings & refine"
        tooltipOptions={{
          placement: Placement.Right
        }}
        size={Size.md}
        on:click={() => (isRefineShown = !isRefineShown)}
      />
    </header>
    <main class="flex flex-col gap-8 mx-5 overflow-auto">
      {#if isRefineShown}
        <div class="flex gap-4 items-center">
          <Button
            icon="funnel"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            label="Filters"
            isPreventMinWidth={true}
          />
          <Button
            icon="bars-center-left"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            label="Sort"
            isPreventMinWidth={true}
          />
          <Button
            icon={arrangement === Arrangement.LIST ? "list" : "rectangle-group"}
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            isPreventMinWidth={true}
            label={arrangement === Arrangement.LIST ? "List" : "Grid"}
            on:click={() => {
              const newArrangement =
                arrangement === Arrangement.LIST
                  ? Arrangement.GRID
                  : Arrangement.LIST;
              uiState.setResourceState(
                resource,
                ResourceAccessPoint.BROWSER,
                UIState.arrangement,
                newArrangement
              );
              arrangement = newArrangement;
            }}
          />
        </div>
      {/if}
      {#if state === ResourceAccessPointState.DEFAULT && starred.length > 0}
        <div class="flex flex-col gap-4">
          <Text style={TextStyle.SECTION_HEADING} content="Starred" />
          <Resources
            data={starred}
            accessPoint={ResourceAccessPoint.BROWSER}
            {resource}
            {arrangement}
            size={Size.sm}
            defaultAccessMode={ResourceAccessMode.INLINE}
          />
        </div>
      {/if}
      <div class="flex flex-col gap-4">
        <Text
          style={TextStyle.SECTION_HEADING}
          content={state === ResourceAccessPointState.SEARCH
            ? "Search results"
            : "All"}
        />
        <Resources
          {data}
          accessPoint={ResourceAccessPoint.BROWSER}
          {resource}
          {arrangement}
          size={Size.sm}
          defaultAccessMode={ResourceAccessMode.INLINE}
          accessPointState={state}
        />
      </div>
      <ScrollViewBottomSpacer />
    </main>
    {#if $multiSelectStore.length > 0}
      <BottomFloat zIndex="z-30">
        <BulkEditBar
          isConstrainedWidth={true}
          context={multiSelectContext}
          on:selectAll={onSelectAll}
          on:action={onBulkAction}
        />
      </BottomFloat>
    {/if}
  </div>
  <slot slot="right" name="right">
    {#key id}
      {#if id}
        <ResourceResolver {id} accessMode={ResourceAccessMode.INLINE} />
      {:else}
        <EmptyStatusView
          size={Size.lg}
          mainText="Nothing selected."
          subText={`Please select a ${resource} to view it here.`}
        />
      {/if}
    {/key}
  </slot>
</Panel>

<ComponentBaseLayer
  subscribeTo={[resource]}
  syncDownOnMount={true}
  on:syncDown={refresh}
  on:change={refresh}
/>
