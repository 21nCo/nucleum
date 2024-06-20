<script lang="ts">
  import { MemotronEvent } from "$lib/client/types/memotron/memotronEvent.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Direction } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { TextInputStyle } from "$lib/client/types/textinput.enum";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { liveQuery } from "dexie";
  import CurationThumbnailView from "./CurationThumbnailView.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { curations as curationsStore } from "./curation.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  curationsStore.refresh();
  let searchQuery: string = "";
  // let curations: CurationThumbnail[] = [];
  let curations = liveQuery(() =>
    $dataManager.cacheSource.dexie.curation
      .filter(activeResourceFilter)
      .toArray()
  );
  // curations = curationsSeedDataAr;
  let selectedPanel = "All";
  let filteredItems = $curations?.filter((c) => c.isStarred);
  $: if (searchQuery) {
    filteredItems = $curations.filter((c) => {
      return c.label.toLowerCase().includes(searchQuery.toLowerCase());
    });
  } else if (selectedPanel === "Starred") {
    filteredItems = $curations?.filter((c) => c.isStarred) ?? [];
  } else {
    filteredItems = $curations ?? [];
  }
  //TODO - by recently opened - temp by created
  // $: recentItems = $curations
  //   .filter((c) => {
  //     return (
  //       new Date(c.createdAt) >
  //       new Date(new Date().setDate(new Date().getDate() - 100))
  //     );
  //   })
  //   .slice(0, 4);
</script>

<Panel
  floatingButton={{
    label: "Create curation",
    callback: async () => appStore.runAction(MemotronEvent.CREATE_CURATION),
    icon: "plus",
    variant: ButtonVariant.PRIMARY
  }}
>
  <slot name="nonpadded" slot="nonpadded">
    <div class="px-4 py-2">
      <Text style={TextStyle.PAGE_HEADING_SUBTLE} content={"Curations"} />
    </div>
    <div class="flex flex-col gap-4 h-full">
      <div class="flex gap-1 items-center py-2 mx-4 border-b border-brs2">
        <Icon icon="search" size={Size.sm} />
        <TextInput
          bind:value={searchQuery}
          size={Size.lg}
          style={TextInputStyle.PLAIN}
          placeholder="Search curations"
        />
        {#if searchQuery}
          <Button
            icon="cross"
            tooltip="Clear query"
            size={Size.sm}
            on:click={() => {
              searchQuery = "";
            }}
          />
          <!-- {:else}
          <Button icon="adjustments-vertical" size={Size.sm} /> -->
        {/if}
        <Button
          icon="adjustments-vertical"
          tooltip="Advanced filters"
          toolTipPlacement={Direction.Right}
          size={Size.sm}
        />
      </div>
      <div class="flex flex-col gap-8">
        <!-- Instead of recent items sort by option: most recent or alphabetical or when focusing search? -->
        <!-- <div class="flex flex-col">
          <div class="mx-4">
            <Text
              style={TextStyle.SECTION_HEADING_SMALL}
              content="Recently opened"
            />
          </div>
          <div class="flex flex-wrap mx-2">
            {#each recentItems as curation}
              <CurationThumbnailView
                {curation}
                on:click={() => runAction(MemotronEvent.NODE, curation.id)}
              />
            {/each}
          </div>
        </div> -->
        <div class="flex flex-col gap-4">
          {#if !searchQuery}
            <div class="mx-4 flex grow justify-between">
              <PanelSwitcher
                items={["All", "Starred"]}
                bind:value={selectedPanel}
                style={PanelSwitcherStyle.DOT}
              />
              <Button icon="bars-center-left" size={Size.sm} />
            </div>
          {/if}
          {#if filteredItems.length > 0}
            <div class="flex flex-wrap mx-2">
              {#each filteredItems as curation}
                <CurationThumbnailView
                  {curation}
                  on:click={(e) =>
                    appStore.resourceClickHandler(e, curation.id)}
                />
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div></slot
  >
  <slot slot="right" name="right">
    <slot />
  </slot>
</Panel>
