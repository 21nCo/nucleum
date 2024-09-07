<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Arrangement, Position } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { liveQuery } from "dexie";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { appStore } from "$lib/client/stores/app.store";
  import { collectionStore } from "../collection/collection.store";
  import { InputStyle } from "$lib/client/types/input.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { Resource } from "$lib/client/components/resourceStores/resource.enum";
  import Resources from "./Resources.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { page } from "$app/stores";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import { resourceAction } from "$lib/client/components/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType,
    ResourceAccessMode
  } from "$lib/client/components/resourceStores/resource.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import BulkEditBar from "./BulkEditBar.svelte";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import { SearchStore } from "../memotron.store";
  import { onMount } from "svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { resolveMultiSelectStore } from "$lib/client/components/resourceStores/resource.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  export let resource: Resource;
  collectionStore.refresh();
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
  $: multiSelectContext = resource + "-" + ResourceAccessPoint.BROWSER;
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

  let data: any[] = [];
  let starred: any[] = [];
  onMount(async () => {
    await refresh();
  });
  function onSelectAll() {
    $multiSelectStore = data.map((x) => x.id);
  }
  async function onBulkAction(action: string) {
    if (action === "archive") {
      await collectionStore.bulkModify($multiSelectStore, {
        isArchived: true
      });
    } else if (action === "delete") {
      await collectionStore.bulkTrash($multiSelectStore);
    } else if (action === "star") {
      await collectionStore.bulkModify($multiSelectStore, {
        isStarred: true
      });
    }
    $multiSelectStore = [];
  }
  async function refresh() {
    data = await searchStore.select({
      searchQuery
    });
    starred = await searchStore.starred();
  }
</script>

<Panel {floatingButton}>
  <slot name="nonpadded" slot="nonpadded">
    <div class="relative flex flex-col gap-4 h-full">
      <header class="flex gap-1 items-center py-4 px-5 border-b border-brs2">
        <!-- TODO - use InlineSearchBar -->
        <TextInput
          bind:value={searchQuery}
          size={Size.lg}
          style={InputStyle.PLAIN}
          on:keydown={refresh}
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
            placement: Position.Right
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
              icon={arrangement === Arrangement.LIST
                ? "list"
                : "rectangle-group"}
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
        {#if !isValidString(searchQuery)}
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
            content={isValidString(searchQuery) ? "Search results" : "All"}
          />
          <Resources
            {data}
            accessPoint={ResourceAccessPoint.BROWSER}
            {resource}
            {arrangement}
            size={Size.sm}
            defaultAccessMode={ResourceAccessMode.INLINE}
          />
        </div>
        <ScrollViewBottomSpacer />
      </main>
      {#if $multiSelectStore.length > 0}
        <BottomFloat>
          <BulkEditBar
            size={Size.sm}
            context={multiSelectContext}
            on:selectAll={onSelectAll}
            on:archive={() => onBulkAction("archive")}
            on:delete={() => onBulkAction("delete")}
            on:star={() => onBulkAction("star")}
          />
        </BottomFloat>
      {/if}
    </div>
  </slot>
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
